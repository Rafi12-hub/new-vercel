const MockModel = require('./MockModel');
const MockQuery = require('./MockQuery');

class User extends MockModel {
    constructor(data) {
        super('students', data);
    }

    static find(query) {
        return new MockQuery('students', query, 'find');
    }

    static findById(id) {
        return new MockQuery('students', id, 'findById');
    }

    static findOne(query) {
        return new MockQuery('students', query, 'findOne');
    }

    static countDocuments(query) {
        return new MockQuery('students', query, 'countDocuments');
    }

    static async distinct(field, query = {}) {
        const docs = await this.find(query);
        const values = docs.map(d => d[field]).filter(Boolean);
        return [...new Set(values)];
    }

    static async aggregate(pipeline) {
        return MockQuery.aggregate('students', pipeline);
    }
}

module.exports = User;
