const MockModel = require('./MockModel');
const MockQuery = require('./MockQuery');

class WeeklyTask extends MockModel {
    constructor(data) {
        super('weeklyTasks', data);
    }

    static find(query) {
        return new MockQuery('weeklyTasks', query, 'find');
    }

    static findById(id) {
        return new MockQuery('weeklyTasks', id, 'findById');
    }

    static findOne(query) {
        return new MockQuery('weeklyTasks', query, 'findOne');
    }

    static countDocuments(query) {
        return new MockQuery('weeklyTasks', query, 'countDocuments');
    }

    static async distinct(field, query = {}) {
        const docs = await this.find(query);
        const values = docs.map(d => d[field]).filter(Boolean);
        return [...new Set(values)];
    }

    static async aggregate(pipeline) {
        return MockQuery.aggregate('weeklyTasks', pipeline);
    }
}

module.exports = WeeklyTask;
