import mysql.connector
import re

REGEX_CLF = re.compile(r"""(.*) (.*) (.*) \[(.*)\] "(.*)" (\d+) (\d+) "(.*)" "(.*)""")
COLUMN_NAMES = ["remote_ip", "identd", "userid", "time", "request", "status_code", "size", "referer", "user_agent"]


CONFIG = json.load(open(args.config, "r"))
RDS = CONFIG["rds"]
DATABASE = RDS["database"]


def read_log_file(filename: str) -> dict:
    rows = {}
    with open(filename, "r") as file:
        for n, line in enumerate(file.readlines()):
            matches = re.findall(REGEX_CLF, line)

            if len(matches) > 0:
                
                

    return rows

