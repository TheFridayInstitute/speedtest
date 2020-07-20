import glob
import os
import urllib.request
import re
from typing import *
import json
import pandas as pd
import itertools


error_log_re = re.compile(r"error\.log(\.\d+)?$")
error_log_ip_re = re.compile(r"\[client (.*):.*\]")
error = "bytes exceeds the limit of"

get_ip_info_url = lambda ip: f"https://ipinfo.io/{ip}/json?token=3230fe01b43b1b"


def call_ip_info(ip: str) -> Optional[dict]:
    try:
        return json.loads(urllib.request.urlopen(get_ip_info_url(ip)).read())
    except Exception as e:
        print(e)
        return None


def find_error_ips(filename: str) -> dict:
    ips = []

    with open(filename, "r") as file:
        for n, line in enumerate(file.readlines()):
            if line.find(error) != -1:
                matches = re.findall(error_log_ip_re, line)

                if len(matches) > 0:
                    ip = matches[0]
                    ips.append(
                        {"ip": ip, "line_number": n, "filename": filename,}
                    )

    return ips


get_from_iterable = lambda iterable, key: [i[key] for i in iterable]


def find_errors(dirpath: str):
    files = [file for file in os.listdir(dirpath) if re.match(error_log_re, file)]
    ips = []

    for filename in sorted(files):
        print(f"working on {filename}")
        filepath = os.path.join(dirpath, filename)
        ips.extend(find_error_ips(filepath))

    errors = []

    for ip, igroup in itertools.groupby(ips, key=lambda x: x["ip"]):
        group = list(igroup)
        
        filenames, line_numbers = (
            get_from_iterable(group, "filename"),
            get_from_iterable(group, "line_number"),
        )
        data = call_ip_info(ip)

        if data:
            data.update({"filenames": filenames, "line_numbers": line_numbers})
            errors.append(data)

    return errors


dirpath = "/Users/mkbabb/Downloads/apache2"
out_path = "errors.csv"

errors = find_errors(dirpath)
df = pd.DataFrame(errors)
df.to_csv(out_path, index=False)

