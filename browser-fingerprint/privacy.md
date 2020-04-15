# Privacy Policy

April 10, 2020

All of the data for the [browser fingerprint exhibition](https://rethread.art/browser-fingerprint/) is collected in an anonymized form which ensures that it is not Personally Identifiable Information nor otherwise likely to lead to the identification or tracking of any web users. Personally identifiable information (PII) is any data that could potentially identify a specific individual.

We are committed to protecting the privacy of all visitors of the [browser fingerprint exhibition](https://rethread.art/browser-fingerprint/). In this privacy policy, "we" refers to the [rethread collective](https://rethread.art), who are bound to keep all information they receive confidential.

## Information Gathered by the AmIUnique Website

For the needs of the [browser fingerprint exhibition](https://rethread.art/browser-fingerprint/), we have developed a computer program that collects anonymous data about the configuration of the browsers of the exhibition's visitors who have accepted to participate in the exhibition. If you click the "Participate" the information will  be collected from your browser. Although these kinds of data may form a fingerprint that could, in principle, be combined with information about page requests and identifying details in order to track visitor's browsing habits, we will **never** do so.

The specific fingerprint information we collect is:
- the User agent header: HTTP header sent to the server that contains information regarding your browser and operating system
- the Accept header: HTTP header sent to the server that contains information regarding the type of media that are acceptable for the response
- the Connection header: HTTP header sent to the server that contains specific options that are desired for that particular connection
- the Encoding header: HTTP header sent to the server that lists the compression methods supported by the browser
- the Language header: HTTP header sent to the server that indicates the preferred languages for the response
- the list of plugins: Browser-populated JavaScript attribute that gives the list of activated plugins in the browser (window.navigator.plugins)
- the platform: Browser-populated JavaScript attribute that indicates the platform the browser is running on (window.navigator.platform)
- the cookies preferences (allowed or not): Browser-populated JavaScript attribute that indicates if the browser accepts cookies or not (window.navigator.cookieEnabled)
- the Do Not Track preferences (yes, no or not communicated): Browser-populated JavaScript attribute that indicates your Do Not Track setting (window.navigator.doNotTrack), "NC" means the value was not specified
- the timezone: Timezone offset of your browser obtainable through JavaScript (new Date().getTimezoneOffset())
- the screen resolution and its color depth: Browser-populated JavaScript attributes that indicate the resolution of the device’s screen (window.screen.height/width/colorDepth)
- the use of local storage: JavaScript test to find out if local storage is supported (storage of a specific value in "localStorage")
- the use of session storage: JavaScript test to find out if session storage is supported (storage of a specific value in "sessionStorage")
- a picture rendered with the HTML Canvas element: Rendering of a specific picture with the HTML5 Canvas element following a fixed set of instructions. The picture presents some slight noticeable variations depending on the OS and the browser used.
- the presence of AdBlock: Test to find out if the AdBlock extension is installed
- the list of fonts: Flash attribute that gives the entire list of fonts installed on the operating system (flash.text.Font.enumerateFonts(true))

The complete source code to collect this data is open source and available [here](https://github.com/castor-software/rethread/tree/master/code/fingerprinting/server/backend).

In addition to these data, we collect set a cookie a session cookie on your device. This how you can be virtually present in the exhibition and participate in its real-time co-creation. This cookie allows us to retrieve your fingerprint and delete it if you want us to do so when you leave the exhibition.

### Cookies

We set a 2-hour cookie for to let you participate in the exhibition with your own fingerprint. If you want to disable/enable browser cookies, you can visit [this page](https://www.avast.com/c-enable-disable-cookies) to find the specific way for your browser. You should be aware that entirely disabling cookies may prevent you from enjoying the artworks presented in the virtual [browser fingerprint exhibition](https://rethread.art/browser-fingerprint/).


## Security

In a general way, we commit to carry out technical and organizational means to protect all information we gathered against illegal or fortuitous destruction, fortuitous loss, alteration, diffusion or unauthorized access. Although we make good faith efforts to store information collected in a secure operating environment, we cannot guarantee complete security. Information collected will be maintained for a length of time appropriate to the needs of this software art project.

## Credits

This Privacy Policy is based on some material from the [Electronic Frontier Foundation](https://www.eff.org/), which is freely redistributed under the [Creative Commons Attribution License](http://creativecommons.org/licenses/by/3.0/us/), as well as some material from the [amiunique.org privacy policy](https://amiunique.org/privacy), which is distributed under an [MIT license](https://github.com/DIVERSIFY-project/amiunique/blob/master/LICENSE.md).
