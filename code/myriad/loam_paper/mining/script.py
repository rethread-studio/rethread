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
	
	return repo.created_at, contributors_list, total_contributions, count_anonymous_contributors

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

def find_element_that_has_attribute(arr, attr, val):
	return [el for el in arr if el[attr] == val][0]

def get_all_loggedin_contributors(repos):
	repos_info = []
	all_loggedin_contributors = []
	gh_api_failures = []
	for [repo_name, category] in repos:
		print(repo_name + " (" + category + ")")

		exclusivity = None
		for l in exclusive_lists:
			if repo_name in l["repos"]:
				exclusivity = l["artwork"]

		repo_info = {
			"name": repo_name,
			"category": category,
			"exclusivity": exclusivity
		}
		
		try:
			created_at, contributors_list, total_contributions, count_anonymous_contributors = get_contributors(repo_name)
			save_repo_data(repo_name, contributors_list)

			repo_info["created_at"] = created_at
			repo_info["total_contributions"] = total_contributions
			repo_info["anonymous_contributors"] = count_anonymous_contributors
			repo_info["loggedin_contributors"] = len(contributors_list)
			
			repos_info.append(repo_info)

			all_ids = [c["id"] for c in all_loggedin_contributors]
			for c in contributors_list:
				if c["id"] in all_ids:
					# it's a known contributor
					found_contributor = find_element_that_has_attribute(all_loggedin_contributors, "id", c["id"])
					found_contributor["contributions"].append({"repo_name": repo_name, "contributions": c["contributions"]})
				else:
					# it's a new contributor
					all_loggedin_contributors.append({
						"type": c["type"],
						"id": c["id"],
						"contributions": [{"repo_name": repo_name, "contributions": c["contributions"]}]
					})
		except Exception as e: 
			gh_api_failures.append(repo_info)
			print(e)

	repos_info.sort(key=lambda x: x["created_at"])
	with open("../dataset/repos_info.json", "w") as fp:
		json.dump(repos_info, fp, indent = 1, default=str)

	all_loggedin_contributors.sort(key=lambda x: len(x["contributions"]), reverse=True)
	with open("../dataset/all_loggedin_contributors.json", "w") as fp:
		json.dump(all_loggedin_contributors, fp, indent = 1)

	gh_api_failures.sort(key=lambda x: x["name"])
	with open("../dataset/gh_api_failures.json", "w") as fp:
		json.dump(gh_api_failures, fp, indent = 1)

def get_categories_info(repos):
	categories_info = []
	for [repo_name, category] in repos:
		all_categories = [c["category"] for c in categories_info]
		if category in all_categories: 
			# it's a known category
			found_category_info = find_element_that_has_attribute(categories_info, "category", category)
			found_category_info["repos"].append(repo_name)
		else:
			# it's a new category
			new_category_info = {
				"category": category,
				"repos": [repo_name]
			}
			categories_info.append(new_category_info)
	
	categories_info.sort(key=lambda x: x["category"])
	other_idx = [i for i, cat_info in enumerate(categories_info) if cat_info["category"] == "other"][0]
	categories_info[other_idx], categories_info[-1] = categories_info[-1], categories_info[other_idx]
	for c in categories_info:
		c["repos"].sort()
	
	with open("../dataset/categories_info.json", "w") as fp:
		json.dump(categories_info, fp, indent = 1)
	
with open("./exclusive_lists.csv", mode = "r") as f:
	csvFile = csv.reader(f)
	lines = [line for line in csvFile]
	exclusive_lists = [{"artwork": artwork, "repos": repos.split(";")} for [artwork, repos] in lines]

with open("./repo_list.csv", mode = "r") as f:
	csvFile = csv.reader(f)
	repos = [line for line in csvFile]

#get_all_loggedin_contributors(repos)
get_categories_info(repos)