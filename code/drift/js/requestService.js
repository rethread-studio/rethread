class RequestService {

    async getRequest(url) {
        const options = {
            method: 'GET',
            headers: { 'content-type': 'application/json' },
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