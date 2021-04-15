## Releasing a new npm version

- Change the version in `package.json`, make a new git tag, and push it to GitHub.
- Wait until the GitHub Actions on the master branch pass.
- The artifacts of the latest GitHub Action run should be downloaded from the actions tab of the GitHub repository
- The artifacts.zip should be extracted and placed under the `prebuilds` folder (replacing the old folder if it exists).

	The `prebuilds` folder should look like the following.
	```
	repository-root
		|-prebuilds
			 |_linux-x64
	  		 |...
			 |_darwin-x64
				 |...
			 |_win32-x64
				 |...
	```

- Then:
	```
	npm publish
	```
