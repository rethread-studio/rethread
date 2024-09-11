# documentation: https://pygithub.readthedocs.io/en/stable/github_objects/NamedUser.html#github.NamedUser.NamedUser
from github import Github
# Authentication is defined via github.Auth
from github import Auth
#import subprocess
#import requests
import json
#import re
import sys
from datetime import datetime, timedelta

#assumes that GH token is in a file "github_access_token.txt" that's in the same folder as this file
tok = open("github_access_token.txt", "r")
tok.seek(0)
tok_str=tok.readline().rstrip('\n')
#print(tok_str)
# using an access token
auth = Auth.Token(tok_str)
g = Github(auth=auth)
#subprocess.check_call(["git", "clone", "git@github.com:processing/p5.js.git"])

def get_gh_contributors(repo):
	print("Getting contributors")

	contributors = repo.get_contributors(anon=True)
	total_contributors = contributors.totalCount
	total_contributions = 0
	contributors_list = []

	for i in range(total_contributors):
		c = contributors[i]
		contributor_info = {
			"type": c.type,
			"contributions": c.contributions
		}
		if c.type == "Anonymous":
			hexhash = hex(abs(hash(c.email)))
			contributor_info["id"] = hexhash[2:].rjust(16, "0")
		else:
			contributor_info["id"] = c.login

		total_contributions += c.contributions
		contributors_list.append(contributor_info)
		print_progress_bar(i+1, total_contributors)

	# fuse users with same email?
	print("")
	
	return total_contributions, contributors_list

def get_gh_commit_history(repo, end_date):
	print("Getting commits")

	start_date = repo.created_at.astimezone()
	end_date = datetime.now().astimezone()
	total_days = (end_date - start_date).days
	n_periods = 32
	period_days = total_days // n_periods

	commits_over_time = [0] * n_periods
	for i in range(n_periods):
		period_start_date = start_date + timedelta(days = i*period_days)
		period_end_date = period_start_date + timedelta(days = period_days)

		commits = repo.get_commits(since = period_start_date, until = period_end_date)

		num_commits = len(list(commits))
		commits_over_time[i] = num_commits
		print_progress_bar(i+1, n_periods)

	print("")
	return commits_over_time

def get_and_save_gh_info(repo_name):
	print(repo_name)
	repo = g.get_repo(repo_name)

	#commits_over_time = get_gh_commit_history(repo)
	total_contributions, contributors_list = get_gh_contributors(repo)

	filename = "contributors/" + repo_name.replace("/", "&") + ".json"
	repo_data = {
		"repo": repo_name,
		#"commits_over_time": commits_over_time,
		"total_contributions": total_contributions,
		"contributors": contributors_list,
	}
	with open(filename, "w") as fp:
		json.dump(repo_data, fp, indent = 1)


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
		get_and_save_gh_info(repo.rstrip("\n"))
print("All done ✨")

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
 
