import json
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

repos_info = pd.read_json("../dataset/repos_info.json")
all_loggedin_contributors = pd.read_json("../dataset/all_loggedin_contributors.json")

with open("../dataset/categories_info.json", "r") as f:
	categories_info = json.load(f)
category_names = [c["category"] for c in categories_info]
category_names.sort()

def avg_contributors_per_category_barplot():
    # average number of anon/loggedin contributors per category
    data = []
    for cat_info in categories_info:
        category = cat_info["category"]
        repos = repos_info.loc[repos_info["category"] == category]
        avg_anonymous = repos.loc[:, "anonymous_contributors"].mean()
        avg_loggedin = repos.loc[:, "loggedin_contributors"].mean()
        if avg_anonymous == avg_anonymous: data.append(
            {
                "category": category,
                "logged-in": avg_loggedin,
                "anonymous": avg_anonymous
            }
        )
    data = pd.DataFrame(data)
    data.set_index("category").plot(kind="bar", stacked=False, color=["steelblue", "red"])
    plt.yscale("log")
    plt.xlabel("category")
    plt.ylabel("average number of contributors")
    plt.show()

def contributions_years_scatterplot():
    # relationship between date created and number of contributions
    g = sns.relplot(
        data=repos_info,
        x="created_at", y="total_contributions",
        hue="category", size=10
    )
    g.set(yscale="log")
    plt.xticks(rotation=90)
    plt.xlabel("year of creation/apparition on GitHub")
    plt.ylabel("total number of contributions")
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
    data = [{"number of repos contributed to": i+1, "number of accounts": 0} for i in range(len(all_loggedin_contributors.iloc[idx]["contributions"]))]
    for index, row in all_loggedin_contributors.iterrows():
        if (row["type"] == "Bot"): continue
        nb_repos_contributed_to = len(row["contributions"])-1
        data[nb_repos_contributed_to]["number of accounts"] += 1
    data = pd.DataFrame(data)
    g = sns.barplot(data, x="number of repos contributed to", y="number of accounts", color="orange")
    g.bar_label(g.containers[0])
    plt.yscale("log")
    plt.ylabel("user count")
    plt.show()

def exclusive_repos_per_artwork_barplot():
    # number of exclusive repos per artwork
    artworks = list(set(repos_info.loc[:,"exclusivity"]))
    artworks.remove(None)
    artworks.remove("loam")
    artworks.sort()
    data = []
    for a in ["A ... past", "Apocryph", "Dear Ai", "Glommen", "... Sand Sorter", "Megatouch", "Pain", "RELAX...", "Why ... this?"]:
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
    data.set_index("exclusivity").plot(kind="bar", stacked=True)
    plt.xlabel("artworks")
    plt.ylabel("number of exclusive repositories")
    plt.legend(title="category")
    plt.show()

avg_contributors_per_category_barplot()
#contributions_years_scatterplot()
repos_per_year_barplot()
multi_contributors_barplot()
exclusive_repos_per_artwork_barplot()