/**
 * EC2 Speedtest Server Deployer
 *
 * Provisions lightweight speedtest-only servers on AWS EC2.
 * Each instance runs the speedtest-server.ts entry point with heartbeat to the central API.
 */

import {
    EC2Client,
    RunInstancesCommand,
    DescribeImagesCommand,
    DescribeVpcsCommand,
    DescribeSubnetsCommand,
    CreateSecurityGroupCommand,
    AuthorizeSecurityGroupIngressCommand,
    DescribeSecurityGroupsCommand,
    type Instance,
} from "@aws-sdk/client-ec2";

interface DeployOptions {
    region: string;
    instanceType?: string;
    name: string;
    centralApiUrl: string;
    serverSecret?: string;
    keyName?: string;
}

interface DeployResult {
    instanceId: string;
    publicIp: string | null;
    region: string;
    serverId: string;
}

const SECURITY_GROUP_NAME = "speedtest-server-sg";

async function getVpcAndSubnet(ec2: EC2Client): Promise<{ vpcId: string; subnetId: string }> {
    const vpcs = await ec2.send(new DescribeVpcsCommand({}));
    const vpc = vpcs.Vpcs?.find((v) => v.IsDefault) ?? vpcs.Vpcs?.[0];
    if (!vpc?.VpcId) throw new Error("No VPC found");

    const subnets = await ec2.send(
        new DescribeSubnetsCommand({
            Filters: [{ Name: "vpc-id", Values: [vpc.VpcId] }],
        }),
    );
    const subnet = subnets.Subnets?.[0];
    if (!subnet?.SubnetId) throw new Error("No subnet found in VPC");

    return { vpcId: vpc.VpcId, subnetId: subnet.SubnetId };
}

async function getOrCreateSecurityGroup(ec2: EC2Client, vpcId: string): Promise<string> {
    try {
        const desc = await ec2.send(
            new DescribeSecurityGroupsCommand({
                Filters: [
                    { Name: "group-name", Values: [SECURITY_GROUP_NAME] },
                    { Name: "vpc-id", Values: [vpcId] },
                ],
            }),
        );
        if (desc.SecurityGroups?.length) {
            return desc.SecurityGroups[0].GroupId!;
        }
    } catch {
        // Not found — create it
    }

    const create = await ec2.send(
        new CreateSecurityGroupCommand({
            GroupName: SECURITY_GROUP_NAME,
            Description: "Speedtest server: HTTP, HTTPS, SSH",
            VpcId: vpcId,
        }),
    );

    const groupId = create.GroupId!;

    for (const port of [80, 443, 22]) {
        await ec2.send(
            new AuthorizeSecurityGroupIngressCommand({
                GroupId: groupId,
                IpProtocol: "tcp",
                FromPort: port,
                ToPort: port,
                CidrIp: "0.0.0.0/0",
            }),
        );
    }

    return groupId;
}

async function getLatestAmiId(ec2: EC2Client): Promise<string> {
    const images = await ec2.send(
        new DescribeImagesCommand({
            Owners: ["amazon"],
            Filters: [
                { Name: "name", Values: ["al2023-ami-2023.*-x86_64"] },
                { Name: "state", Values: ["available"] },
            ],
        }),
    );

    if (!images.Images?.length) {
        throw new Error("No Amazon Linux 2023 AMI found");
    }

    // Sort by creation date descending, pick the newest
    images.Images.sort((a: { CreationDate?: string }, b: { CreationDate?: string }) =>
        (b.CreationDate ?? "").localeCompare(a.CreationDate ?? ""),
    );

    return images.Images[0].ImageId!;
}

export async function deploySpeedtestServer(opts: DeployOptions): Promise<DeployResult> {
    const { region, instanceType = "t3.micro", name, centralApiUrl, serverSecret, keyName } = opts;
    const serverId = `speedtest-${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString(36)}`;

    const ec2 = new EC2Client({ region });

    const { vpcId, subnetId } = await getVpcAndSubnet(ec2);

    const [sgId, amiId] = await Promise.all([
        getOrCreateSecurityGroup(ec2, vpcId),
        getLatestAmiId(ec2),
    ]);

    // User-data script: install Docker, write server JS to host, mount into container
    const serverJs = `
const { serve } = require('@hono/node-server');
const { Hono } = require('hono');
const crypto = require('crypto');
const app = new Hono();
let currentLoad = 0;
app.all('/api/speedtest/empty', (c) => { c.header('Cache-Control', 'no-store'); return c.body(null, 200); });
app.get('/api/speedtest/garbage', (c) => {
  const ckSize = Math.min(parseInt(c.req.query('ckSize') || '4', 10) || 4, 1024);
  currentLoad++;
  const chunks = [];
  for (let i = 0; i < ckSize; i++) chunks.push(crypto.randomBytes(1024 * 1024));
  currentLoad = Math.max(0, currentLoad - 1);
  c.header('Content-Type', 'application/octet-stream');
  c.header('Cache-Control', 'no-store');
  return c.body(Buffer.concat(chunks));
});
app.get('/api/speedtest/getIP', (c) => {
  const ip = c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() || '127.0.0.1';
  return c.json({ processedString: ip, rawIspInfo: null });
});
app.get('/health', (c) => c.json({ status: 'ok', serverId: process.env.SERVER_ID, currentLoad, uptime: process.uptime() }));
serve({ fetch: app.fetch, port: parseInt(process.env.PORT || '3000') }, (info) => console.log('Speedtest server on port ' + info.port));
setInterval(async () => {
  try { await fetch(process.env.CENTRAL_API_URL + '/api/internal/servers/' + process.env.SERVER_ID + '/heartbeat', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Server-Secret': process.env.SERVER_SECRET || '' }, body: JSON.stringify({ currentLoad, capacity: 50 }) }); } catch {}
}, 30000);
setTimeout(async () => {
  try { await fetch(process.env.CENTRAL_API_URL + '/api/internal/servers/' + process.env.SERVER_ID + '/heartbeat', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Server-Secret': process.env.SERVER_SECRET || '' }, body: JSON.stringify({ currentLoad: 0, capacity: 50 }) }); } catch {}
}, 5000);
`.trim();

    // Base64 encode the server JS to avoid shell quoting issues
    const serverJsB64 = Buffer.from(serverJs).toString("base64");

    const userData = Buffer.from(`#!/bin/bash
set -ex
yum update -y
yum install -y docker
systemctl enable docker
systemctl start docker

# Write server code to host filesystem
mkdir -p /opt/speedtest
echo '${serverJsB64}' | base64 -d > /opt/speedtest/server.js

# Run container with mounted server code
docker run -d --restart=always \\
  -p 80:3000 \\
  -v /opt/speedtest/server.js:/app/server.js:ro \\
  -e SERVER_ID="${serverId}" \\
  -e SERVER_NAME="${name}" \\
  -e SERVER_REGION="${region}" \\
  -e CENTRAL_API_URL="${centralApiUrl}" \\
  ${serverSecret ? `-e SERVER_SECRET="${serverSecret}"` : ""} \\
  -e PORT=3000 \\
  --name speedtest-server \\
  node:22-alpine sh -c "cd /app && npm init -y && npm install hono @hono/node-server && node server.js"
`).toString("base64");

    const result = await ec2.send(
        new RunInstancesCommand({
            ImageId: amiId,
            InstanceType: instanceType as any,
            MinCount: 1,
            MaxCount: 1,
            ...(keyName ? { KeyName: keyName } : {}),
            UserData: userData,
            NetworkInterfaces: [{
                DeviceIndex: 0,
                SubnetId: subnetId,
                Groups: [sgId],
                AssociatePublicIpAddress: true,
            }],
            TagSpecifications: [
                {
                    ResourceType: "instance",
                    Tags: [
                        { Key: "Name", Value: `speedtest-${name}` },
                        { Key: "Purpose", Value: "speedtest-server" },
                        { Key: "ServerId", Value: serverId },
                    ],
                },
            ],
        }),
    );

    const instance: Instance = result.Instances?.[0]!;

    return {
        instanceId: instance.InstanceId!,
        publicIp: instance.PublicIpAddress ?? null,
        region,
        serverId,
    };
}
