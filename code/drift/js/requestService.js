class RequestService {

    async getRequest(url, key) {
        const options = {
            method: 'GET',
            headers: { 'content-type': 'application/json', 'X-Mashape-Key': key },
        };
        let data = await (fetch(url, options)
            .then(res => {
                return res.json()
            })
            .catch(err => {
                console.log('Error: ', err)
            })
        )
        return data
    }
}