const { db } = require('../config/firebase');

class MockQuery {
    constructor(collectionName, queryObj = {}, mode = 'find') {
        this.collectionName = collectionName;
        this.queryObj = queryObj;
        this.mode = mode; // find, findOne, findById, countDocuments
        this._sort = null;
        this._limit = null;
        this._skip = null;
        this._populate = [];
    }

    populate(path, select) {
        this._populate.push({ path, select });
        return this;
    }

    sort(sortOption) {
        this._sort = sortOption;
        return this;
    }

    limit(limitValue) {
        this._limit = parseInt(limitValue);
        return this;
    }

    skip(skipValue) {
        this._skip = parseInt(skipValue);
        return this;
    }

    select(selectOption) {
        return this;
    }

    lean() {
        return this;
    }

    async exec() {
        let query = db.collection(this.collectionName);

        // Convert queryObj to Firestore query
        if (this.mode === 'findById') {
            if (!this.queryObj) return null;
            const doc = await query.doc(this.queryObj.toString()).get();
            if (!doc.exists) return null;
            const data = doc.data();
            for (const [k, v] of Object.entries(data)) {
                if (v && typeof v.toDate === 'function') {
                    data[k] = v.toDate();
                }
            }
            const res = { _id: doc.id, id: doc.id, ...data };
            res.toObject = () => res;
            return res;
        }

        let isFiltered = false;
        // Standard find queries
        if (this.queryObj && typeof this.queryObj === 'object') {
            for (const [key, val] of Object.entries(this.queryObj)) {
                if (key === '$or') {
                    if (Array.isArray(val) && val.length > 0) {
                        const subQuery = val[0];
                        for (const [k, v] of Object.entries(subQuery)) {
                            if (typeof v === 'object' && v !== null && v.$regex) {
                                // Ignore regex for simple query or match
                            } else {
                                query = query.where(k, '==', v);
                            }
                        }
                    }
                } else if (key === '$and') {
                    if (Array.isArray(val) && val.length > 0) {
                        for (const subQuery of val) {
                            for (const [k, v] of Object.entries(subQuery)) {
                                if (k !== '$or') {
                                    query = query.where(k, '==', v);
                                }
                            }
                        }
                    }
                } else if (typeof val === 'object' && val !== null) {
                    for (const [op, opVal] of Object.entries(val)) {
                        if (op === '$lte') {
                            query = query.where(key, '<=', opVal);
                            isFiltered = true;
                        } else if (op === '$gte') {
                            query = query.where(key, '>=', opVal);
                            isFiltered = true;
                        } else if (op === '$gt') {
                            query = query.where(key, '>', opVal);
                            isFiltered = true;
                        } else if (op === '$lt') {
                            query = query.where(key, '<', opVal);
                            isFiltered = true;
                        } else if (op === '$ne') {
                            query = query.where(key, '!=', opVal);
                            isFiltered = true;
                        } else if (op === '$in') {
                            if (Array.isArray(opVal) && opVal.length > 0) {
                                query = query.where(key, 'in', opVal);
                                isFiltered = true;
                            }
                        }
                    }
                } else {
                    query = query.where(key, '==', val);
                }
            }
        }

        // Handle sort to prevent index constraints errors
        if (this._sort && isFiltered) {
            // Firestore requires specific composite indexes when sorting on filtered fields.
            // To be robust for local development, we will sort manually in memory
        } else if (this._sort) {
            let field = 'createdAt';
            let direction = 'asc';
            if (typeof this._sort === 'string') {
                if (this._sort.startsWith('-')) {
                    field = this._sort.slice(1);
                    direction = 'desc';
                } else {
                    field = this._sort;
                }
            } else if (typeof this._sort === 'object') {
                const keys = Object.keys(this._sort);
                if (keys.length > 0) {
                    field = keys[0];
                    direction = this._sort[field] === -1 ? 'desc' : 'asc';
                }
            }
            try {
                query = query.orderBy(field, direction);
            } catch (e) {
                // Ignore orderBy index errors locally and sort in memory
            }
        }

        if (this._limit && !this._sort && !isFiltered) {
            query = query.limit(this._limit);
        }

        const snapshot = await query.get();
        let docs = snapshot.docs.map(doc => {
            const data = doc.data();
            for (const [k, v] of Object.entries(data)) {
                if (v && typeof v.toDate === 'function') {
                    data[k] = v.toDate();
                }
            }
            const res = { _id: doc.id, id: doc.id, ...data };
            res.toObject = () => res;
            return res;
        });

        // In-memory sorting if ordered manually
        if (this._sort) {
            let field = 'createdAt';
            let direction = 'asc';
            if (typeof this._sort === 'string') {
                if (this._sort.startsWith('-')) {
                    field = this._sort.slice(1);
                    direction = 'desc';
                } else {
                    field = this._sort;
                }
            } else if (typeof this._sort === 'object') {
                const keys = Object.keys(this._sort);
                if (keys.length > 0) {
                    field = keys[0];
                    direction = this._sort[field] === -1 ? 'desc' : 'asc';
                }
            }
            docs.sort((a, b) => {
                let aVal = a[field];
                let bVal = b[field];
                if (aVal instanceof Date) aVal = aVal.getTime();
                if (bVal instanceof Date) bVal = bVal.getTime();
                if (typeof aVal === 'string') {
                    return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                }
                return direction === 'asc' ? (aVal - bVal) : (bVal - aVal);
            });
        }

        if (this._skip) {
            docs = docs.slice(this._skip);
        }
        if (this._limit) {
            docs = docs.slice(0, this._limit);
        }

        // Manual Populate
        for (const p of this._populate) {
            for (const doc of docs) {
                let foreignId = doc[p.path];
                if (foreignId && Array.isArray(foreignId)) {
                    const populatedList = [];
                    for (const fId of foreignId) {
                        const populatedDoc = await this.resolveForeign(p.path, fId);
                        if (populatedDoc) populatedList.push(populatedDoc);
                    }
                    doc[p.path] = populatedList;
                } else if (foreignId) {
                    const populatedDoc = await this.resolveForeign(p.path, foreignId);
                    if (populatedDoc) doc[p.path] = populatedDoc;
                }
            }
        }

        if (this.mode === 'findOne') {
            return docs.length > 0 ? docs[0] : null;
        }

        if (this.mode === 'countDocuments') {
            return docs.length;
        }

        return docs;
    }

    async resolveForeign(path, foreignId) {
        if (typeof foreignId !== 'string') {
            if (foreignId && foreignId.toString) foreignId = foreignId.toString();
            else return null;
        }
        let foreignDoc = null;
        if (path === 'user' || path === 'student') {
            foreignDoc = await db.collection('students').doc(foreignId).get();
        } else if (path === 'question') {
            foreignDoc = await db.collection('questions').doc(foreignId).get();
        } else if (path === 'reportedBy') {
            foreignDoc = await db.collection('users').doc(foreignId).get();
        } else if (path === 'weeklyTask' || path === 'questions') {
            // questions can point to questions collection
            if (path === 'questions') {
                foreignDoc = await db.collection('questions').doc(foreignId).get();
            } else {
                foreignDoc = await db.collection('weeklyTasks').doc(foreignId).get();
            }
        }
        if (foreignDoc && foreignDoc.exists) {
            const data = foreignDoc.data();
            for (const [k, v] of Object.entries(data)) {
                if (v && typeof v.toDate === 'function') {
                    data[k] = v.toDate();
                }
            }
            return { _id: foreignDoc.id, id: foreignDoc.id, ...data };
        }
        return null;
    }

    then(onFulfilled, onRejected) {
        return this.exec().then(onFulfilled, onRejected);
    }

    static async aggregate(collectionName, pipeline) {
        const snapshot = await db.collection(collectionName).get();
        let docs = snapshot.docs.map(doc => {
            const data = doc.data();
            for (const [k, v] of Object.entries(data)) {
                if (v && typeof v.toDate === 'function') {
                    data[k] = v.toDate();
                }
            }
            return { _id: doc.id, id: doc.id, ...data };
        });

        for (const stage of pipeline) {
            if (stage.$match) {
                const match = stage.$match;
                docs = docs.filter(doc => {
                    for (const [key, val] of Object.entries(match)) {
                        let docVal = doc[key];
                        if (key === 'user' || key === 'student' || key === 'question') {
                            if (docVal && typeof docVal === 'object' && docVal.id) {
                                docVal = docVal.id;
                            }
                        }
                        if (val && typeof val === 'object') {
                            if (val.$in) {
                                const list = val.$in.map(v => v.toString ? v.toString() : v);
                                if (!docVal || !list.includes(docVal.toString())) return false;
                            } else if (val.$ne !== undefined) {
                                if (docVal === val.$ne) return false;
                            } else if (val.$exists !== undefined) {
                                const exists = docVal !== undefined;
                                if (exists !== val.$exists) return false;
                            } else if (val.$gte !== undefined) {
                                if (!docVal || docVal < val.$gte) return false;
                            } else if (val.$lte !== undefined) {
                                if (!docVal || docVal > val.$lte) return false;
                            }
                        } else {
                            if (docVal === undefined || docVal === null) return false;
                            if (docVal.toString() !== val.toString()) return false;
                        }
                    }
                    return true;
                });
            } else if (stage.$group) {
                const group = stage.$group;
                const groups = {};
                for (const doc of docs) {
                    let groupKey = '';
                    if (typeof group._id === 'string' && group._id.startsWith('$')) {
                        const field = group._id.slice(1);
                        groupKey = doc[field] !== undefined ? doc[field] : 'null';
                    } else if (typeof group._id === 'object' && group._id !== null) {
                        const keyObj = {};
                        for (const [k, v] of Object.entries(group._id)) {
                            if (typeof v === 'string' && v.startsWith('$')) {
                                const field = v.slice(1);
                                keyObj[k] = doc[field] !== undefined ? doc[field] : 'null';
                            }
                        }
                        groupKey = JSON.stringify(keyObj);
                    } else {
                        groupKey = 'null';
                    }

                    if (!groups[groupKey]) {
                        groups[groupKey] = {
                            _id: typeof group._id === 'object' && group._id !== null ? JSON.parse(groupKey) : groupKey,
                            _docs: []
                        };
                    }
                    groups[groupKey]._docs.push(doc);
                }

                const results = [];
                for (const g of Object.values(groups)) {
                    const result = { _id: g._id };
                    for (const [accKey, accVal] of Object.entries(group)) {
                        if (accKey === '_id') continue;
                        if (accVal.$sum !== undefined) {
                            if (accVal.$sum === 1) {
                                result[accKey] = g._docs.length;
                            } else if (typeof accVal.$sum === 'string' && accVal.$sum.startsWith('$')) {
                                const field = accVal.$sum.slice(1);
                                result[accKey] = g._docs.reduce((sum, d) => sum + (Number(d[field]) || 0), 0);
                            }
                        } else if (accVal.$avg !== undefined) {
                            if (typeof accVal.$avg === 'string' && accVal.$avg.startsWith('$')) {
                                const field = accVal.$avg.slice(1);
                                const sum = g._docs.reduce((sum, d) => sum + (Number(d[field]) || 0), 0);
                                result[accKey] = g._docs.length > 0 ? sum / g._docs.length : 0;
                            }
                        } else if (accVal.$min !== undefined) {
                            if (typeof accVal.$min === 'string' && accVal.$min.startsWith('$')) {
                                const field = accVal.$min.slice(1);
                                const vals = g._docs.map(d => Number(d[field])).filter(v => !isNaN(v));
                                result[accKey] = vals.length > 0 ? Math.min(...vals) : 0;
                            }
                        }
                    }
                    results.push(result);
                }
                docs = results;
            } else if (stage.$sort) {
                const sortOpt = stage.$sort;
                const field = Object.keys(sortOpt)[0];
                const order = sortOpt[field];
                docs.sort((a, b) => {
                    let aVal = a[field];
                    let bVal = b[field];
                    if (aVal instanceof Date) aVal = aVal.getTime();
                    if (bVal instanceof Date) bVal = bVal.getTime();
                    if (typeof aVal === 'string') {
                        return order === 1 ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                    }
                    return order === 1 ? aVal - bVal : bVal - aVal;
                });
            } else if (stage.$limit) {
                docs = docs.slice(0, stage.$limit);
            }
        }
        return docs;
    }
}

module.exports = MockQuery;
