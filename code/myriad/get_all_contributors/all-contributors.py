# documentation: https://pygithub.readthedocs.io/en/stable/github_objects/NamedUser.html#github.NamedUser.NamedUser
from github import Github
# Authentication is defined via github.Auth
from github import Auth
import subprocess
import requests
import json
import re

#assumes that GH token is in a file "github_access_token.txt" that's in the same folder as this file
tok = open("github_access_token.txt", "r")
tok.seek(0)
tok_str=tok.readline().rstrip('\n')
print(tok_str)
# using an access token
auth = Auth.Token(tok_str)
g = Github(auth=auth)
#subprocess.check_call(["git", "clone", "git@github.com:processing/p5.js.git"])

dependency_name="ms"

url = "https://api.npms.io/v2/package/"+dependency_name
resp = requests.get(url)
dependency_data = json.loads(resp.content)
#print(json.dumps(package_data, indent=4))

#get the url to the github repo for the dependency
repo_link=dependency_data["collected"]["metadata"]["links"]["repository"]
print(repo_link)

#get the name of the repo used in the GH API query
repo_name=re.split("github.com/", repo_link, 1)[1]
print(repo_name)
repo = g.get_repo(repo_name)

#get contributors to the GH repo for the dependency
contributors = repo.get_contributors()
for c in contributors:
	print(c.name)
 
