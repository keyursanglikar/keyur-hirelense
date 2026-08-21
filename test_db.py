import sqlite3
conn = sqlite3.connect('f:/FREELANCE/NZ-Solutions/keyur-hirelense-final/ca-saas-platform/backend/hirelense_backend/db.sqlite3')
cur = conn.cursor()
cur.execute('SELECT name FROM sqlite_master WHERE type="table";')
print([x[0] for x in cur.fetchall()])
