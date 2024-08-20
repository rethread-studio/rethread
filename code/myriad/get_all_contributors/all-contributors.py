# documentation: https://pygithub.readthedocs.io/en/stable/github_objects/NamedUser.html#github.NamedUser.NamedUser
from github import Github
# Authentication is defined via github.Auth
from github import Auth
#import subprocess
#import requests
import json
#import re
import sys

#assumes that GH token is in a file "github_access_token.txt" that's in the same folder as this file
tok = open("github_access_token.txt", "r")
tok.seek(0)
tok_str=tok.readline().rstrip('\n')
#print(tok_str)
# using an access token
auth = Auth.Token(tok_str)
g = Github(auth=auth)
#subprocess.check_call(["git", "clone", "git@github.com:processing/p5.js.git"])

def get_gh_contributors(repo_name):
	repo = g.get_repo(repo_name)

	contributors = repo.get_contributors(anon=True)
	total_contributors = contributors.totalCount
	total_contributions = 0
	contributors_list = []

	print("Getting "+repo_name+" contributors")
	for i in range(total_contributors):
		c = contributors[i]
		contributor_info = {
			"type": c.type,
			"contributions": c.contributions,
			"email": c.email
		}
		if c.type == "User":
			contributor_info["id"] = c.login
		else:
			contributor_info["id"] = c.name

		total_contributions += c.contributions
		contributors_list.append(contributor_info)
		print_progress_bar(i+1, total_contributors)

	# fuse users with same email?
	print("")
	filename = "contributors/" + repo_name.replace(".", "_").replace("/", "-") + ".json"
	repo_data = {
		"repo": repo_name,
		"total_contributions": total_contributions,
		"contributors": contributors_list
	}
	with open(filename, "w") as fp:
		json.dump(repo_data, fp, indent = 1)
	return contributors_list

def print_progress_bar(iteration, total, length=50):
    filled_length = int(length * iteration // total)
    bar = '█' * filled_length + '-' * (length - filled_length)
    sys.stdout.write(f'\r|{bar}| {iteration}/{total}')
    sys.stdout.flush()

with open("gh_repo_lists/all_gh_repos.txt") as f:
    repos = f.readlines()
#print(repos)
for repo in repos:
	if repo[0] != "*":
		get_gh_contributors(repo.rstrip("\n"))

#print(repo.get_stats_contributors())

#dependency_name="ms"

#url = "https://api.npms.io/v2/package/"+dependency_name
#resp = requests.get(url)
#dependency_data = json.loads(resp.content)
#print(json.dumps(package_data, indent=4))

#get the url to the github repo for the dependency
#repo_link=dependency_data["collected"]["metadata"]["links"]["repository"]
#print(repo_link)

#get the name of the repo used in the GH API query
#repo_name=re.split("github.com/", repo_link, 1)[1]
#print(repo_name)
#repo = g.get_repo(repo_name)

#get contributors to the GH repo for the dependency
#contributors = repo.get_contributors()
#for c in contributors:
#	print(c.name)
 
