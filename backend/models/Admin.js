const MockModel = require('./MockModel');
const MockQuery = require('./MockQuery');

class Admin extends MockModel {
    constructor(data) {
        super('users', data);
    }

    static find(query) {
        return new MockQuery('users', query, 'find');
    }

    static findById(id) {
        return new MockQuery('users', id, 'findById');
    }

    static findOne(query) {
        return new MockQuery('users', query, 'findOne');
    }

    static countDocuments(query) {
        return new MockQuery('users', query, 'countDocuments');
    }

    static async distinct(field, query = {}) {
        const docs = await this.find(query);
        const values = docs.map(d => d[field]).filter(Boolean);
        return [...new Set(values)];
    }

    static async aggregate(pipeline) {
        return MockQuery.aggregate('users', pipeline);
    }
}

module.exports = Admin;
