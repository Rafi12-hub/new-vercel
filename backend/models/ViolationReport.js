const MockModel = require('./MockModel');
const MockQuery = require('./MockQuery');

class ViolationReport extends MockModel {
    constructor(data) {
        super('violations', data);
    }

    static find(query) {
        return new MockQuery('violations', query, 'find');
    }

    static findById(id) {
        return new MockQuery('violations', id, 'findById');
    }

    static findOne(query) {
        return new MockQuery('violations', query, 'findOne');
    }

    static countDocuments(query) {
        return new MockQuery('violations', query, 'countDocuments');
    }

    static async distinct(field, query = {}) {
        const docs = await this.find(query);
        const values = docs.map(d => d[field]).filter(Boolean);
        return [...new Set(values)];
    }

    static async aggregate(pipeline) {
        return MockQuery.aggregate('violations', pipeline);
    }
}

module.exports = ViolationReport;
