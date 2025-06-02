import time
import datetime

start_time = time.time()

def get_uptime_seconds() -> float:
    return time.time() - start_time

def format_uptime(seconds: float) -> str:
    return str(datetime.timedelta(seconds=int(seconds)))
