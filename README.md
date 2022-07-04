# rethread

This is the repository for the software art installations developped and performed by the [re|thread collective](https://rethread.art/).

# Licences

The code in this repository is under the MIT License unless otherwise specified.

<a rel="license" href="http://creativecommons.org/licenses/by/4.0/"><img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by/4.0/88x31.png" /></a><br />The sonic, visual and audiovisual works of re|thread in this repository are licensed under the <a rel="license" href="http://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution 4.0 International License</a> unless otherwise specified.

# Usage

## openFrameworks projects

OF projects reside in the `code/OF/` folder. To compile them you have to put a version of openFrameworks in the folder yourself. Don't overwrite the `apps` folder though.

1. Download the latest stable release of OF for your platform.
2. Copy everything but the `apps` folder from the openFrameworks installation to the folder `code/OF/` in the cloned rethread repo. Everything but the `apps` folder (which includes all our code) should be ignored by git because of the .gitignore rules. (If it isn't, let me know)
3. Run the normal openFrameworks installation scripts.
4. Compile the project you want to run (if you're on Windows you may need to use the projectGenerator to generate a project file for Visual Studio or Qt creator)

To add a new project you have to manually allow the folder in the file `code/.gitignore` by following the same pattern that is already there. Note that a folder has to be included before you can include its subfolders if the folder has been excluded by a previous rule.
