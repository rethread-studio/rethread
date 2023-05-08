# First version of the re|thread credits

The goal is to credit as extensively as possible all the contributors to open source software projects that have been used by [re|thread](https://rethread.art/), as well as past and present team members, friends of the collective, and artistic inspirations.

A live version of these credits was projected on a wall at Den Fantastiska Platsen for the [re|cord re|lease party](https://record.rethread.art/E.html), and they can also be seen online on the re|cord website [credits page](https://record.rethread.art/C.html).

## Data

The contributor names/usernames/email addresses are gathered through the GitHub API, git commands (``git clone https://github.com/[org]]/[repo].git``, then ``cd [repo]``, then ``git shortlog -sne --all > [org]_[repo]_contributors.txt``) or manually, then processed with a Python script, [``data_analysis.py``](data/data_analysis.py), and stored in [JSON files](data/processed_datasets/).

## Visualization

These contributors are visualized with a [p5.js](https://p5js.org/) script. Each band represents the contributors of one project (with the exception of ``artistic-inspirations`` and ``rethread-and-friends``). The mouse can be moved to see which project a band corresponds to, and how many contributors it has, while also slowing it down (only in the desktop version). Double clicking on a band open the GitHub/GitLab page (once again, with the exception of ``artistic-inspirations`` and ``rethread-and-friends``). Random glitch effects are added for aesthetic purposes.

An URL parameter, ``wholescreen`` can be added. Its possible values are:
- [``yes``](https://rethread.art/code/credits/visualization/?wholescreen=yes): the height of each band is adjusted so that the whole sketch fills the browser window,
- [``no``](https://rethread.art/code/credits/visualization/?wholescreen=no): each band has a predetermined height, regardless of browser window height. 

The default value is ``no``.