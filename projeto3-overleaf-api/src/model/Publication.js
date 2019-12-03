let client = require('mongodb').MongoClient;

class Publication{

    constructor(data){
        this.email = data.email;
        this.text = data.text;
    }

    static async find () {
        let conn = await client.connect('mongodb+srv://admin:1234@cluster0-tql9j.mongodb.net/projeto2?retryWrites=true&w=majority',
            {useNewUrlParser: true, useUnifiedTopology: true});
        let db = await conn.db();
        return await db.collection('publications').find().toArray();
    }
    
    static async save (publication) {
        let conn = await client.connect('mongodb+srv://admin:1234@cluster0-tql9j.mongodb.net/projeto2?retryWrites=true&w=majority',
            {useNewUrlParser: true, useUnifiedTopology: true});
        let db = await conn.db();
        return await db.collection('publications').insertOne(publication);
    }

    static async search (search) {
        let conn = await client.connect('mongodb+srv://admin:1234@cluster0-tql9j.mongodb.net/projeto2?retryWrites=true&w=majority',
            {useNewUrlParser: true, useUnifiedTopology: true});
        let db = await conn.db();
        return await db.collection('publications').find({$or: [{email: search}, {text: {$in: [search]}}]}).toArray();
    }
}

module.exports = Publication;