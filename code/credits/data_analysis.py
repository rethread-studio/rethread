import json
import copy
import itertools

def make_repo_list():
    file_list = ["gh_api_repo_list.txt", "gitlog_repo_list.txt", "others_repo_list.txt"]
    repo_list = []
    for filename in file_list:
        with open("repo_lists/" + filename, "r") as f:
            repo_list += f.readlines()
    repo_list.sort()
    with open("repo_lists/all_repos.txt", "w") as f:
        f.writelines(repo_list)
    repo_list = [r.replace("/", "_").removesuffix("\n") for r in repo_list]
    return repo_list

def turn_gitlogs_into_raw_datasets():
    with open("repo_lists/gitlog_repo_list.txt", "r") as f:
        gitlog_repo_list = f.readlines()
    for repo in gitlog_repo_list:
        repo_name = repo.replace("/", "_").removesuffix("\n")
        filename = "./gitlog_datasets/" + repo_name + "_contributors.txt"
        with open(filename, "r") as f:
            txt_data = f.readlines()
        raw_data = []
        for i in range(int(len(txt_data)/2)):
            d = txt_data[2*i].replace("\x00", "").split("\t")
            num = int(d[0].split(" ").pop())
            email = d.pop().split(" ").pop()
            idx1 = email.find("<")+1
            idx2 = email.find(">")
            raw_data.append({
                "email": email[idx1:idx2],
                "type": "Anonymous",
                "contributions": num
            })
        
        raw_data_filename = "./raw_datasets/" + repo_name + "_contributors_raw.json"
        with open(raw_data_filename, "w") as f:
            json.dump(raw_data, f, indent = 1)

def process_dataset(repo_name):
    raw_data_filename = "./raw_datasets/" + repo_name + "_contributors_raw.json"

    with open(raw_data_filename, encoding="utf-8") as f:
        raw_data = json.load(f)

    contributors = []
    n_contributions = 0 # total number of (non-anonymous) contributions
    for d in raw_data:
        if d["type"] == "Anonymous" and d["email"].find("[bot]") >= 0:
            d["type"] = "Bot"
            idx1 = d["email"].find("+")+1
            idx2 = d["email"].find("@")
            d["login"] = d["email"][idx1:idx2]

        if d["type"] != "Anonymous":
            c = {
                "id": d["login"],
                "type": d["type"],
                "contributions": d["contributions"]
            }
            if c not in contributors:
                n_contributions += d["contributions"]
                contributors.append(c)
        else:
            email = d["email"]
            f = lambda x: x if x >= 0 else len(email)
            at_strings = ["@", "-at-", "_at_", " at ", ".at.", "%"]
            idx = min([f(email.find(at)) for at in at_strings])
            the_id = email[0:idx]

            idx = the_id.find("+")
            if idx != -1:
                if the_id[:idx].isnumeric():
                    the_id = the_id[idx+1:]
                else:
                    the_id = the_id[:idx]

            already_added = False
            for c in contributors:
                if c["id"] == the_id and c["type"] == "Anonymous":
                    c["contributions"] += d["contributions"]
                    already_added = True
                    break
            if not already_added:
                contributors.append({
                    "id": the_id,
                    "type": d["type"],
                    "contributions": d["contributions"]
                })
            n_contributions += d["contributions"]
        

    processed_data = {
        "repo": repo_name,
        "n_contributions": n_contributions,
        "contributors": contributors
    }

    processed_data_filename = "./processed_datasets/" + repo_name + "_contributors_processed.json"

    with open(processed_data_filename, "w") as f:
        json.dump(processed_data, f, indent = 1)

def process_all_datasets():
    for r in repo_list:
        process_dataset(r)
        print(r + " processed")

def merge_datasets():
    all_contributors = []
    multiple_contributors = []
    anonymous_contributors = []

    for r in repo_list:
        filename = "./processed_datasets/" + r + "_contributors_processed.json"
        with open(filename, encoding="utf-8") as f:
            repo_data = json.load(f)
        for d in repo_data["contributors"]:
            if d["type"] == "Anonymous":
                all_contributors.append({
                    "id": d["id"],
                    "type": d["type"],
                    "n_repos": 1,
                    "all_contributions": [{"repo": r, "contributions": d["contributions"]}]
                })
                anonymous_contributors.append(d["id"])
                continue
            already_added = False
            contribution = {"repo": r, "contributions": d["contributions"]}
            for c in all_contributors:
                if d["id"] == c["id"] and c["type"] != "Anonymous":
                    c["all_contributions"].append(contribution)
                    c["n_repos"] += 1
                    already_added = True
                    if d["id"] not in multiple_contributors:
                        multiple_contributors.append(d["id"])
                    break
            if not already_added:
                new_c = {
                    "id": d["id"],
                    "type": d["type"],
                    "n_repos": 1,
                    "all_contributions": [contribution]
                }
                all_contributors.append(new_c)
        print(r + " merged")

    print("Number of unique contributors: " + str(len(all_contributors)))
    print("Number of multiple contributors: " + str(len(multiple_contributors)))
    print("Number of anonymous contributors: " + str(len(anonymous_contributors)))
    with open("all_contributors.json", "w") as f:
        json.dump(all_contributors, f, indent = 1)

    return all_contributors

def find_intersections(repos):
    repos.sort()
    
    intersected = []
    for c in all_contributors:
        if c["n_repos"] >= len(repos):
            toBeFound = copy.copy(repos)
            for contrib in c["all_contributions"]:
                repo = contrib["repo"]
                if repo in toBeFound:
                    toBeFound.remove(repo)
            if len(toBeFound) == 0:
                intersected.append(c)

    return intersected

def find_all_intersections(min, max):
    repos_combinations = list()
    for r in range(min, max):
        repos_combinations += list(itertools.combinations(repo_list, r))

    intersections = []

    for repos in repos_combinations:
        intersected = find_intersections(list(repos))
        if len(intersected) > 0:
            intersections.append({
                "repos": repos,
                "n_contributors": len(intersected),
                "contributors": intersected
            })

    intersections.sort(key=lambda x: x["n_contributors"], reverse=True)
    
    with open("intersections.json", "w") as f:
        json.dump(intersections, f, indent = 1)


turn_gitlogs_into_raw_datasets()

repo_list = make_repo_list()

process_all_datasets()
all_contributors = merge_datasets()

#find_all_intersections(2, 5)