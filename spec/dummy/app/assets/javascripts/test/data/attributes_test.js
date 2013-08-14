
AttributesTest = Ember.Application.create({
    apiUrl: Global.apiUrl,
    rootElement: '#' + $('<div id="attributes-test">').appendTo('body').attr('id')
});

AttributesTest.Node = Data.Model.extend({
    name: Data.attr('string', { defaultValue: 'My node' }),
    children: Data.hasMany('AttributesTest.Leaf')
});

AttributesTest.Leaf = Data.Model.extend({
    node: Data.belongsTo('AttributesTest.Node'),
    extra: Data.embedded('AttributesTest.ExtraAttributes')
});

AttributesTest.ExtraAttributes = Data.Model.extend(Data.dynamicAttributable, {
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

module("Embedded attributes", withFakeAPI);

test("can be dynamically defined", function () {
    var leaf = AttributesTest.Leaf.load({
        extra: {
            tags: [ 'tic', 'tac', 'toe' ],
            hint: "Unexpected, isn't it?"
        }
    });

    equal(leaf.get('extra.tags.length'), 3);
    [ 'tic', 'tac', 'toe' ].forEach(function (expectedItem, index) {
        equal(leaf.get('extra.tags')[index], expectedItem);
    });
    equal(leaf.get('extra.hint'), "Unexpected, isn't it?");

    leaf.get('extra.tags').popObject();
    leaf.get('extra.tags').pushObject('toc');

    leaf.get('extra').defineAttribute('dynamic', { defaultValue: "Yeah! it's opened" });
    leaf.get('extra').defineAttributes({
        composedName: { defaultValue: "Well" },
        shouldBeCamelized: { defaultValue: "it rocks" },
        canBeArray: { defaultValue: [ 'head', 'tail' ] }
    });

    leaf.set('extra.composedName', 'You know what?');

    equal(JSON.stringify(leaf.toJSON()), JSON.stringify({
        node_id: undefined,
        extra: {
            tags: [ 'tic', 'tac', 'toc' ],
            hint: "Unexpected, isn't it?",
            dynamic: "Yeah! it's opened",
            composedName: "You know what?",
            shouldBeCamelized: "it rocks",
            canBeArray: [ 'head', 'tail' ]
        }
    }));

    leaf.get('extra').resetAttributes();

    equal(JSON.stringify(leaf.toJSON()), JSON.stringify({
        node_id: undefined,
        extra: {}
    }));

    leaf.get('extra').defineAttribute('foo', { defaultValue: "bar" });

    equal(JSON.stringify(leaf.toJSON()), JSON.stringify({
        node_id: undefined,
        extra: {
            foo: 'bar'
        }
    }));

    leaf.get('extra').resetAttributes({
        onlyKey: { defaultValue: [{ k: 'v' }] }
    });

    equal(JSON.stringify(leaf.toJSON()), JSON.stringify({
        node_id: undefined,
        extra: {
            onlyKey: [{ k: 'v' }]
        }
    }));


    var leaf2 = AttributesTest.Leaf.load({
        extra: {
            objectTags: {
                0: { label: 'tic', color: 'blue' },
                1: { label: 'tac', color: 'red' },
                2: { label: 'toe', color: 'green' }
            }
        }
    });

    leaf2.get('extra').defineAttribute('objectTags', { decoder: 'array', defaultValue: [] });

    equal(leaf2.get('extra.objectTags.length'), 3);
    [
        { label: 'tic', color: 'blue' },
        { label: 'tac', color: 'red' },
        { label: 'toe', color: 'green' }
    ].forEach(function (expectedItem, index) {
        equal(leaf2.get('extra.objectTags')[index].label, expectedItem.label);
        equal(leaf2.get('extra.objectTags')[index].color, expectedItem.color);
    });
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
