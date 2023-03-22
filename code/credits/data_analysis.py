import json
import copy
import itertools

def make_repo_list():
    filename = "gh_repo_list.txt"
    with open(filename, "r") as f:
        repo_list = f.readlines()
    repo_list = [r.replace("/", "_").removesuffix("\n") for r in repo_list]
    repo_list.append("redhat_centos-stream_rpms_bpftrace")
    return repo_list

def process_dataset(repo_name):
    raw_data_filename = "./raw_datasets/" + repo_name + "_contributors_raw.json"

    with open(raw_data_filename, encoding="utf-8") as f:
        raw_data = json.load(f)

    contributors = []
    n_contributions = 0 # total number of (non-anonymous) contributions
    for d in raw_data:
        if d["type"] != "Anonymous":
            c = {
                "id": d["login"],
                "type": d["type"],
                "contributions": d["contributions"]
            }
            if c not in contributors:
                n_contributions += d["contributions"]
                contributors.append(c)

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

    for r in repo_list:
        filename = "./processed_datasets/" + r + "_contributors_processed.json"
        with open(filename, encoding="utf-8") as f:
            repo_data = json.load(f)
        for d in repo_data["contributors"]:
            already_added = False
            contribution = {"repo": r, "contributions": d["contributions"]}
            for c in all_contributors:
                if d["id"] == c["id"]:
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

repo_list = make_repo_list()
repo_list.sort()

process_all_datasets()
all_contributors = merge_datasets()

find_all_intersections(2, 5)