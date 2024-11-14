from github import Github
from github import Auth
import csv
import json
import sys

#assumes that GH token is in a file "github_access_token.txt" that's in the same folder as this file
tok = open("github_access_token.txt", "r")
tok.seek(0)
tok_str=tok.readline().rstrip("\n")
auth = Auth.Token(tok_str)
g = Github(auth=auth)

def get_contributors(repo_name):
	repo = g.get_repo(repo_name)

	contributors = repo.get_contributors(anon=True)
	total_contributors = contributors.totalCount
	total_contributions = 0
	count_anonymous_contributors = 0
	contributors_list = []

	for i in range(total_contributors):
		c = contributors[i]
		if c.type != "Anonymous":
			contributor_info = {
				"type": c.type,
				"id": c.login,
				"contributions": c.contributions
			}
			contributors_list.append(contributor_info)
		else:
			count_anonymous_contributors += 1

		total_contributions += c.contributions
		print_progress_bar(i+1, total_contributors)

	print("")
	
	return contributors_list, total_contributions, count_anonymous_contributors

def print_progress_bar(iteration, total, length=50):
    filled_length = int(length * iteration // total)
    bar = "█" * filled_length + "-" * (length - filled_length)
    sys.stdout.write(f"\r|{bar}| {iteration}/{total}")
    sys.stdout.flush()
	
def save_repo_data(repo_name, contributors_list):
	filename = "../dataset/individual_repos/" + repo_name.replace("/", "&")
	repo_data = {
		"repo_name": repo_name,
		"contributors": contributors_list,
	}
	with open(filename + ".json", "w") as fp:
		json.dump(repo_data, fp, indent = 1)

with open("./repo_list.csv", mode = "r") as f:
	csvFile = csv.reader(f)
	repos = [line for line in csvFile]

repos_info = []
all_contributors = []
for [repo_name, category] in repos:
	print(repo_name)
	try:
		contributors_list, total_contributions, count_anonymous_contributors = get_contributors(repo_name)
		save_repo_data(repo_name, contributors_list)

		repo_info = {
			"name": repo_name,
			"category": category,
			"total_contributions": total_contributions,
			"anonymous_contributors": count_anonymous_contributors,
			"nonanonymous_contributors": len(contributors_list)
		}
		repos_info.append(repo_info)

		all_ids = [c["id"] for c in all_contributors]
		for c in contributors_list:
			if c["id"] in all_ids:
				idx = all_ids.index(c["id"])
				all_contributors[idx]["contributions"].append({"repo_name": repo_name, "contributions": c["contributions"]})
			else:
				all_contributors.append({
					"type": c["type"],
					"id": c["id"],
					"contributions": [{"repo_name": repo_name, "contributions": c["contributions"]}]
				})
	except Exception as e: print(e)

with open("../dataset/repos_info.json", "w") as fp:
		json.dump(repos_info, fp, indent = 1)
with open("../dataset/all_contributors.json", "w") as fp:
		json.dump(all_contributors, fp, indent = 1)