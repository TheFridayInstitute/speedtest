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
    DescribeInstancesCommand,
    type Instance,
} from "@aws-sdk/client-ec2";
import {
    Route53Client,
    ChangeResourceRecordSetsCommand,
} from "@aws-sdk/client-route-53";

const HOSTED_ZONE_ID = "ZVBTLAAD8BV9S";
const DNS_SUFFIX = "mbabb.friday.institute";

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
    hostname: string;
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

    const hostname = `speedtest-${name.toLowerCase().replace(/\s+/g, "-")}.${DNS_SUFFIX}`;

    const userData = Buffer.from(`#!/bin/bash
set -ex
yum update -y
yum install -y docker nginx certbot python3-certbot-nginx
systemctl enable docker nginx
systemctl start docker

# Write server code
mkdir -p /opt/speedtest
echo '${serverJsB64}' | base64 -d > /opt/speedtest/server.js

# Run speedtest container on port 3000
docker run -d --restart=always \\
  -p 127.0.0.1:3000:3000 \\
  -v /opt/speedtest/server.js:/app/server.js:ro \\
  -e SERVER_ID="${serverId}" \\
  -e SERVER_NAME="${name}" \\
  -e SERVER_REGION="${region}" \\
  -e CENTRAL_API_URL="${centralApiUrl}" \\
  ${serverSecret ? `-e SERVER_SECRET="${serverSecret}"` : ""} \\
  -e PORT=3000 \\
  --name speedtest-server \\
  node:22-alpine sh -c "cd /app && npm init -y && npm install hono @hono/node-server && node server.js"

# Nginx reverse proxy
cat > /etc/nginx/conf.d/speedtest.conf << 'NGINXEOF'
server {
    listen 80;
    server_name ${hostname};
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINXEOF
# Remove default server block
rm -f /etc/nginx/conf.d/default.conf
systemctl start nginx

# Wait for DNS to propagate then get TLS certificate
sleep 30
for i in 1 2 3 4 5; do
  certbot --nginx -d ${hostname} --non-interactive --agree-tos --register-unsafely-without-email && break
  sleep 30
done
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
                        { Key: "Hostname", Value: hostname },
                    ],
                },
            ],
        }),
    );

    const instance: Instance = result.Instances?.[0]!;
    const instanceId = instance.InstanceId!;

    // Poll for public IP (takes a few seconds after launch)
    let publicIp: string | null = null;
    for (let i = 0; i < 12; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        const desc = await ec2.send(
            new DescribeInstancesCommand({ InstanceIds: [instanceId] }),
        );
        publicIp = desc.Reservations?.[0]?.Instances?.[0]?.PublicIpAddress ?? null;
        if (publicIp) break;
    }

    // Create Route53 DNS record
    if (publicIp) {
        const route53 = new Route53Client({ region: "us-east-1" });
        await route53.send(
            new ChangeResourceRecordSetsCommand({
                HostedZoneId: HOSTED_ZONE_ID,
                ChangeBatch: {
                    Changes: [{
                        Action: "UPSERT",
                        ResourceRecordSet: {
                            Name: hostname,
                            Type: "A",
                            TTL: 60,
                            ResourceRecords: [{ Value: publicIp }],
                        },
                    }],
                },
            }),
        );
    }

    return {
        instanceId,
        publicIp,
        hostname,
        region,
        serverId,
    };
}
