all_repos = []

lists = ["loam", "apocryph", "megatouch", "dear-ai", "glommen", "infinite-sand-sorter", "why-am-i-seeing-this", "relaxrelaxrelax", "pain-creature", "a-not-so-distant-past"]
for l in lists:
    with open(l + "_gh_repos.txt") as f:
        repos = f.readlines()
    all_repos = list(set(all_repos + repos))

all_repos.sort()
#print(all_repos)
with open("all_gh_repos.txt", "w") as f:
    f.writelines(all_repos)