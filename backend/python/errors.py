import glob
import itertools
import json
import os
import re
import urllib.request
from typing import *

import pandas as pd

RE_ERROR_LOG_PATH = re.compile(r"error\.log(\.\d+)?$")
RE_ERROR_LOG_IP = re.compile(r"\[client (.*):.*\]")
ERROR = "bytes exceeds the limit of"

get_ip_info_url = lambda ip: f"https://ipinfo.io/{ip}/json?token=3230fe01b43b1b"

get_from_iterable = lambda iterable, key: [d.get(key) for d in iterable]


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
            if line.find(ERROR) != -1:
                matches = re.findall(RE_ERROR_LOG_IP, line)

                if len(matches) > 0:
                    ip = matches[0]
                    ips.append(
                        {"ip": ip, "line_number": n, "filename": filename,}
                    )

    return ips


def find_errors(dirpath: str) -> List[dict]:
    files = [file for file in os.listdir(dirpath) if re.match(RE_ERROR_LOG_PATH, file)]
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
