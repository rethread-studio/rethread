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
tok_str=tok.readline().rstrip("\n")
#print(tok_str)
# using an access token
auth = Auth.Token(tok_str)
g = Github(auth=auth)
#subprocess.check_call(["git", "clone", "git@github.com:processing/p5.js.git"])

def get_gh_contributors(repo):
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
	repo = g.get_repo(repo_name)

	#commits_over_time = get_gh_commit_history(repo)
	total_contributions, contributors_list = get_gh_contributors(repo)

	filename = "./gh_contributors/" + repo_name.replace("/", "&")
	repo_data = {
		"repo_name": repo_name,
		#"commits_over_time": commits_over_time,
		"total_contributions": total_contributions,
		"contributors": contributors_list,
	}
	with open(filename + ".json", "w") as fp:
		json.dump(repo_data, fp, indent = 1)
	with open(filename + ".txt", "w") as fp:
		fp.write("\n".join(c["id"] for c in contributors_list))


def print_progress_bar(iteration, total, length=50):
    filled_length = int(length * iteration // total)
    bar = "█" * filled_length + "-" * (length - filled_length)
    sys.stdout.write(f"\r|{bar}| {iteration}/{total}")
    sys.stdout.flush()

def turn_txt_into_json(name, path):
	with open(path + "/" + name + ".txt", "r", encoding="utf8") as f:
		contributors = f.readlines()

	json_data = {
		"repo_name": name,
		"total_contributions": len(contributors),
		"contributors": [{"type": "Other", "contributions": 1, "id": c.rstrip("\n")} for c in contributors]
	}
	
	with open(path + "/" + name + ".json", "w") as fp:
		json.dump(json_data, fp, indent = 1)

def turn_json_into_txt(name, path):
	with open(path + "/" + name + ".json", "r") as f:
		json_data = json.load(f)

	contributors = [c["id"] for c in json_data["contributors"]]
	with open(path + "/" + name + ".txt", "w") as f:
		f.write("\n".join(c for c in contributors))

with open("./gh_repos_lists/all_gh_repos.txt", "r") as f:
    repos = f.readlines()

for repo in repos:
	name = repo.rstrip("\n")
	print(name)
	try:
		get_and_save_gh_info(name)
	except:
		print("Can't use GitHub API, looking for .json or .txt files")
		try:
			turn_json_into_txt(name.replace("/", "&"), "./gh_contributors")
			print(".json found and .txt created")
		except:
			try:
				turn_txt_into_json(name.replace("/", "&"), "./gh_contributors")
				print(".txt found and .json created")
			except:
				print("No file found")

with open("./other_projects_lists/all_other_projects.txt", "r") as f:
    other_projects = f.readlines()

for project in other_projects:
	name = project.rstrip("\n")
	print(name)
	print_progress_bar(1, 1)
	print("")
	turn_txt_into_json(project.rstrip("\n"), "./other_contributors")