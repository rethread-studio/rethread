import json

with open("./all_loggedin_contributors.json", "r") as f:
	contributors = json.load(f)
	
usernames = [c["id"]+"\n" for c in contributors if c["type"] == "User"]
usernames.sort()

with open("only_usernames.txt", "w") as f:
    f.writelines(usernames)