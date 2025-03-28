# adapted from https://unix.stackexchange.com/questions/164602/how-to-output-the-directory-structure-to-json-format

import os
import errno
import json
import sys

def path_hierarchy(path):
    basename = os.path.basename(path)

    hierarchy = {
        "name": basename,
        #"path": path[3:],
        "max_depth": 0,
        "leaves_count": 1
    }

    try:
        children = []
        max_depth = 0
        leaves_count = 0
        for contents in os.listdir(path):
            if contents[0] != ".":
                children_hierarchy = path_hierarchy(os.path.join(path, contents))
                children.append(children_hierarchy)
                children_max_depth = children_hierarchy["max_depth"]
                if (children_max_depth > max_depth):
                    max_depth = children_max_depth
                leaves_count += children_hierarchy["leaves_count"]

        hierarchy["max_depth"] = max_depth + 1
        hierarchy["leaves_count"] = leaves_count
        hierarchy["children"] = children
    except OSError as e:
        if e.errno != errno.ENOTDIR:
            raise

    return hierarchy



def write_repo_data(filename):
    hierarchy = path_hierarchy("../../")

    with open(filename, "w") as outfile:
        json.dump(hierarchy, outfile, indent = 1)

write_repo_data("repo_data.json")