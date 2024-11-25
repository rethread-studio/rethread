import csv

all_repos = []

lists = ["loam", "apocryph", "megatouch", "dear-ai", "glommen", "infinite-sand-sorter", "why-am-i-seeing-this", "relaxrelaxrelax", "pain-creature", "a-not-so-distant-past"]
for l in lists:
    with open(l + "_gh_repos.txt") as f:
        repos = f.read().splitlines() 
    all_repos.append(repos)

exclusive_lists = []
non_exclusive_list = []
for i in range(len(all_repos)):
    li = all_repos[i]
    this_exclusive_list = []
    for r in li:
        is_exclusive = True
        for j in range(len(all_repos)):
            if i != j:
                lj = all_repos[j]
                if (r in lj):
                    non_exclusive_list = list(set(non_exclusive_list + [r]))
                    is_exclusive = False
                    break
        if is_exclusive:
            this_exclusive_list.append(r)
    exclusive_lists.append([lists[i], ';'.join(this_exclusive_list)])

with open("exclusive_lists.csv", "w", newline="") as csvfile:
    writer = csv.writer(csvfile, delimiter=",")
    writer.writerows(exclusive_lists)