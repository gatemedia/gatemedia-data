
AttributesTest = Ember.Namespace.create();

AttributesTest.Node = Data.Model.extend({
    name: Data.attr('string', { defaultValue: 'My node' }),
    children: Data.hasMany('AttributesTest.Leaf')
});

AttributesTest.Leaf = Data.Model.extend({
    node: Data.belongsTo('AttributesTest.Node')
});


module("Data extension: attributes", withFakeAPI);

test("default value is returned when undefined", function () {
    var
        node = AttributesTest.Node.load({
            id: 1
        });

    equal(node.get('name'), 'My node');
});

test("default value is returned when null", function () {
    var
        node = AttributesTest.Node.load({
            id: 1,
            name: null
        });

    equal(node.get('name'), 'My node');
});

module("Relations: belongsTo", withFakeAPI);

test("retrieve relation once when id is defined", function () {
    fakeAPI(api, 'GET', 'nodes/42', '{"node":{"id":42}}');

    var
        leaf = AttributesTest.Leaf.load({
            id: 100,
            node_id: 42
        }),
        node1 = leaf.get('node'),
        node2 = leaf.get('node');

    equal(node1, node2);
    equal(api.requests.length, 1);
});

test("cached relation is not shared across instances", function () {
    fakeAPI(api, 'GET', 'nodes/36', '{"node":{"id":36}}');
    fakeAPI(api, 'GET', 'nodes/37', '{"node":{"id":37}}');

    var
        leaf1 = AttributesTest.Leaf.load({
            id: 201,
            node_id: 36
        }),
        leaf2 = AttributesTest.Leaf.load({
            id: 202,
            node_id: 36
        }),
        leaf3 = AttributesTest.Leaf.load({
            id: 203,
            node_id: 37
        }),
        node1 = leaf1.get('node'),
        node2 = leaf2.get('node'),
        node3 = leaf3.get('node');

    equal(node1.get('id'), 36);
    equal(node2, node1);
    equal(node3.get('id'), 37);

    equal(api.requests.length, 2);
});

test("does not retrieve relation when id is null", function () {
    var
        leaf = AttributesTest.Leaf.load({
            id: 300,
            node_id: null
        });

    equal(leaf.get('node'), null);
});


module("Relations: hasMany", withFakeAPI);

test("does not retrieve relation for new record", function () {
    var
        node = AttributesTest.Node.createRecord({
            id: 101,
            children_ids: []
        }),
        children = node.get('children');

    equal(children.get('length'), 0);
    equal(api.requests.length, 0);
});

test("does not retrieve relation for empty set", function () {
    var
        node = AttributesTest.Node.load({
            id: 201,
            children_ids: []
        }),
        children = node.get('children');

    equal(children.get('length'), 0);
    equal(api.requests.length, 0);
});

test("retrieve relation once for non-empty set", function () {
    fakeAPI(api, 'GET', 'leafs?ids%5B%5D=301001&ids%5B%5D=301002', '{"leafs":[{"id":301001},{"id":301002}]}');

    var
        node = AttributesTest.Node.load({
            id: 301,
            children_ids: [ 301001, 301002 ]
        }),
        children = node.get('children');

    equal(children.get('length'), 2);
    equal(api.requests.length, 1);
});
