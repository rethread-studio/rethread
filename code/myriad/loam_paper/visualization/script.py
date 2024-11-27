import json
import pandas as pd
import matplotlib.pyplot as plt

repos_info = pd.read_json("../dataset/repos_info.json")
all_loggedin_contributors = pd.read_json("../dataset/all_loggedin_contributors.json")

with open("../dataset/categories_info.json", "r") as f:
	categories_info = json.load(f)
category_names = [c["category"] for c in categories_info]

def avg_contributors_per_category_barplot():
    # average number of anon/loggedin contributors per category
    data = []
    for cat_info in categories_info:
        category = cat_info["category"]
        repos = repos_info.loc[repos_info["category"] == category]
        avg_loggedin = repos.loc[:, "loggedin_contributors"].mean()
        avg_anonymous = repos.loc[:, "anonymous_contributors"].mean()
        if avg_anonymous is not None: 
            data.append({
                "category": category,
                "logged-in": avg_loggedin,
                "anonymous": avg_anonymous
            })
    data = pd.DataFrame(data)

    fig = plt.figure()
    ax = fig.add_subplot(111)
    ax2 = ax.twinx()

    data.set_index("category").plot(kind="bar", color=["red", "orange"], stacked=False, ax=ax, width=0.5, position=0.5)
    x = [cat["category"] for cat in categories_info]
    y = [len(cat["repos"]) for cat in categories_info]
    second_color = "#377eb8"
    ax2.plot(x, y, ".", markersize=15)
   
    ax.set_ylabel("average number of contributors")
    ax.set_yscale("log")
    ax.legend(title="type of contributor", loc="upper left")
    ax2.set_ylabel("number of repos", color=second_color)
    ax2.tick_params(axis="y", colors=second_color)
    ax2.spines["right"].set(color=second_color, linewidth=2)

    plt.show()

def repos_per_year_barplot():
    # number of repos created per year
    minYear = repos_info["created_at"].min().year
    maxYear = repos_info["created_at"].max().year
    data = []
    for y in range(minYear, maxYear+1):
        o = {"year": y}
        for cat in category_names:
            o[cat] = 0
        data.append(o)
    for index, row in repos_info.iterrows():
        year = row["created_at"].year
        cat = row["category"]
        data[year-minYear][cat] += 1
    data = pd.DataFrame(data)
    data.set_index("year").plot(kind="bar", stacked=True)
    plt.xlabel("year of creation/apparition on GitHub")
    plt.ylabel("number of repositories from the dataset")
    plt.legend(title="category")
    plt.show()

def multi_contributors_barplot():
    # how many (human) users contribute to multiple repos
    idx = 0
    while all_loggedin_contributors.iloc[idx]["type"] == "Bot":
        idx+=1
    data = [{"number of repos contributed to": i+1, "one category": 0, "multiple categories": 0} for i in range(len(all_loggedin_contributors.iloc[idx]["contributions"]))]
    for index, row in all_loggedin_contributors.iterrows():
        if (row["type"] == "Bot"): continue
        contributions = row["contributions"]
        categories = []
        for contrib in contributions:
            for cat in categories_info:
                if contrib["repo_name"] in cat["repos"]:
                    categories.append(cat["category"])
                    break
        categories = list(set(categories))
        nb_repos_contributed_to = len(contributions)-1
        if len(categories) == 1:
            data[nb_repos_contributed_to]["one category"] += 1
        else:
            data[nb_repos_contributed_to]["multiple categories"] += 1
    data = pd.DataFrame(data[1:])
    data.set_index("number of repos contributed to").plot(kind="bar", stacked=False)
    plt.ylabel("user count")
    plt.yscale("log")
    plt.legend(title="type of contributions")
    plt.show()

def exclusive_repos_per_artwork_barplot():
    # number of exclusive repos per artwork
    artworks = list(set(repos_info.loc[:,"exclusivity"]))
    artworks.remove(None)
    artworks.remove("loam")
    artworks.sort()
    data = []
    for a in ["ANSDP", "A", "DA", "G", "ISS", "M", "PC", "R", "WAIST"]:
        o = {"exclusivity": a}
        for cat in category_names:
            o[cat] = 0
        data.append(o)
    for index, row in repos_info.iterrows():
        exclusivity = row["exclusivity"]
        if exclusivity in [None, "loam"]: continue
        idx = artworks.index(exclusivity)
        category = row["category"]
        data[idx][category] += 1
    data = pd.DataFrame(data)
    data.set_index("exclusivity").plot(kind="bar", stacked=True, cmap="Set1")
    plt.xlabel("artworks")
    plt.ylabel("number of exclusive repositories")
    plt.legend(title="category")
    plt.show()

avg_contributors_per_category_barplot()
#repos_per_year_barplot()
multi_contributors_barplot()
exclusive_repos_per_artwork_barplot()