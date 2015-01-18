function highlight() {
    $('pre code').each(function(i, block) {
        hljs.highlightBlock(block);
    });
}

Tangular.register('lower', function(value) {
    return (value || '').toLowerCase();
});

Tangular.register('params', function(value) {
    var builder = [];
    builder.push('<table class="table table-bordered table-responsive" cellpadding="0" cellspacing="0">');
    for (var i = 0, length = value.length; i < length; i++) {

        var param = value[i];
        var callback = '';

        builder.push('<tr>');
        builder.push('<td class="active">' + param.name + '<br /><b>' + param.type + '</b></td>');

        if (param.params) {
            for (var j = 0; j < param.params.length; j++) {
                var is = param.params[j].options && param.params[j].options.indexOf('optional') !== -1 ? true : false;
                callback += (callback !== '' ? ',' : '') + (is ? '[' : '') + param.params[j].name + (is ? ']' : '');
            }
        }

        builder.push('<td>' + (param.options ? '<span>' + param.options.join(',') + '</span>' : '') + (param.description || '') + (param.default ? '<div class="member-body-default"><b>Default value</b>: ' + param.default + '</div>' : '') + (param.params ? '<div><b>function ' + param.name + '(' + callback + ') {}</b>' + Thelpers['params'](param.params) + '</div>' : '') + '</td>');
        builder.push('</tr>');
    }
    builder.push('</table>');
    return builder.join('');
});

function go(name) {
    var el = $('#' + name);
    if (el.length === 0)
        return;
    $('html,body').animate({ scrollTop: el.offset().top - 20 }, 300);
}

function reload() {
    var linker = decodeURIComponent(window.location.hash.substring(1)).split('~');
    if (linker[0] === '#' || linker[0] === '')
        return;
    if (linker[2] === undefined)
        $('html,body').scrollTop(0);
    render(linker[0], linker[1], linker[2]);
}

function configure() {

    var pages = documentation['pages'];
    var api = documentation['api'];
    var links = documentation['links'];

    var gp = {}, ga = {}, gl = [];

    for (var i = 0, length = pages.length; i < length; i++) {
        var obj = pages[i];
        if (!obj.group)
            obj.group = '';
        obj.linker = '#' + encodeURIComponent('pages~' + obj.name);
        if (gp[obj.group] === undefined)
            gp[obj.group] = [obj];
        else
            gp[obj.group].push(obj);
    }

    for (var i = 0, length = api.length; i < length; i++) {
        var obj = api[i];
        obj.linker = '#' + encodeURIComponent('api~' + obj.name);
        if (!obj.group)
            obj.group = '';
        if (ga[obj.group] === undefined)
            ga[obj.group] = [obj];
        else
            ga[obj.group].push(obj);
    }

    for (var i = 0, length = links.length; i < length; i++) {
        var obj = links[i];
        obj.linker = obj.url;
        gl.push(obj);
    }

    var arr = Object.keys(gp);
    var el = $('#menu').empty();

    arr.sort(sort);
    gp[''].push.apply(gp[''], gl);

    for (var i = 0, length = arr.length; i < length; i++)
        el.append(Tmenu({ name: arr[i], items: gp[arr[i]] }));

    arr = Object.keys(ga);

    for (var i = 0, length = arr.length; i < length; i++)
        el.append(Tmenu({ name: arr[i], items: ga[arr[i]] }));

    $('#menu').find('li').find('a').each(function() {
        var el = $(this);
        var href = el.attr('href');
        if (href.substring(0, 4) !== 'http')
            return;
        el.addClass('external');
    });
}

$.get($('body').attr('data-json'), function(data) {
    documentation = data;
    if ((window.location.hash || '').length < 2)
        window.location.href = '#' + encodeURIComponent(documentation['default']);
    $('#version').html('v' + data.version + (data.build ? ' (' + data.build + ')' : ''));
    configure();
    $('#logo').attr('href', '#' + encodeURIComponent(documentation['default']));
    reload();
    $('#loading').hide();
    $('#container').removeClass('hidden');
});

var isFirst = true;
var isSearch = false;
var documentation;
var latest;
var Tmenu = Tangular.compile($('#template-menu').html());
var Tmember = Tangular.compile($('#template-api-members').html());
var Tlinks = Tangular.compile($('#template-api-links').html());
var Tsearch = Tangular.compile($('#template-search').html());

window.onhashchange = reload;

function render(type, name, linker) {

    var current = type + '~' + name;
    if (current === latest)
        return;

    latest = current;

    setTimeout(function() {
        var el = $('li[data-id="' + type + '~' + encodeURIComponent(name) + '~' + encodeURIComponent(linker) + '"]');
        if (el.length === 0) {
            $('html,body').scrollTop(0);
            return;
        }
        var top = el .offset().top;
        $('html,body').animate({ scrollTop: top }, 100);
        el.find('.body').removeClass('hidden');
    }, 500);

    if (isSearch)
        $('#search').val('');

    var arr = documentation[type];
    var item;

    for (var i = 0, length = arr.length; i < length; i++) {
        if (arr[i].name === name) {
            item = arr[i];
            break;
        }
    }

    if (!item)
        return;

    var menu = $('#menu');

    menu.find('.selected').removeClass('selected');
    menu.find('li').find('a[href="' + item.linker + '"]').addClass('selected');

    if (linker === undefined && type !== 'api') {
        document.title = item.name + (item.group ? ' (' + item.group + ')' : '');
        $('#content').html('<h1>' + item.name + '</h1><div class="markdown">' + marked(item.body.replace(/‘|’/g, '\'')).replace(/<img src=/g, '<img class="img-responsive" src=') + '</div>');
        highlight();
        return;
    }

    document.title = item.name + ' (' + item.group + ')';
    render_api(item);
    $('a.member').bind('click', function(e) {
        $(this).parent().find('.body').toggleClass('hidden');
    });
}

function render_api(item) {

    var api = [];
    var members;
    var links = {};

    if (item.properties) {
        links.properties = true;
        members = prepare('api', item.name, item.properties);
        api.push(Tmember({ name: 'Properties', members: members }));
    }

    if (item.methods) {
        links.methods = true;
        members = prepare('api', item.name, item.methods);
        api.push(Tmember({ name: 'Methods', members: members }));
    }

    if (item.delegates) {
        links.delegates = true;
        members = prepare('api', item.name, item.delegates);
        api.push(Tmember({ name: 'Delegates', members: members }));
    }

    if (item.events) {
        links.events = true;
        members = prepare('api', item.name, item.events);
        api.push(Tmember({ name: 'Events', members: members }));
    }

    $('#content').html('<h1>' + item.name + '</h1><div class="markdown">' + marked((item.description || '').replace(/‘|’/g, '\'')) + '</div>' + Tlinks(links) + api.join(''));
    highlight();
}

function sort(a, b) {
    if (a.name)
        a = a.name;
    if (b.name)
        b = b.name;
    if (a === '')
        return -1;
    if (b === '')
        return -1;
    return a.localeCompare(b);
}

function prepare(type, name, arr) {

    if (!arr)
        return [];

    arr = arr.slice(0);

    for (var i = 0, length = arr.length; i < length; i++) {

        var item = arr[i];
        item.linker = encodeURIComponent(type + '~' + name + '~' + item.name);
        item.body = marked(item.description.replace(/‘|’/g, '\''));

        if (!item.params)
            continue;

        var names = [];
        for (var j = 0, l = item.params.length; j < l; j++) {
            var isOptional = item.params[j].options ? item.params[j].options.indexOf('optional') !== -1 : false;
            names.push((isOptional ? '[' : '') + item.params[j].name + (isOptional ? ']' : ''));
        }

        // check event
        var index = item.name.indexOf(')');
        if (index !== -1) {
            item.name = item.name.substring(0, item.name.length - 1);
            if (!item['return'])
                item['return'] = 'Framework';
            item.name_params = ', function(' + names.join(', ').replace(/\s$/g, '') + ') { /* body */ })';
        } else {
            index = item.name.indexOf('}');
            if (index !== -1) {
                item.name = item.name.substring(0, item.name.length - 1);
                item.name_params = '(' + names.join(', ').replace(/\s$/g, '') + ')}';
            }
        }

        if (!item.name_params)
            item.name_params = '(' + names.join(', ').replace(/\s$/g, '') + ')';
    }

    arr.sort(sort);
    return arr;
}

$(document).ready(function() {

    $('.offline').toggle(!navigator.onLine);
    $('#fork').toggle(navigator.onLine);

    var timeout;
    var index = window.location.pathname.lastIndexOf('/');
    var selected = window.location.pathname.substring(index + 1);
    $('.language').find('a[href="' + selected + '"]').addClass('selected');

    $('#search').bind('keydown', function(e) {
        clearTimeout(timeout);
        timeout = setTimeout(function() {
            $('#search').trigger('change');
        }, 500);
    });

    $('#search').bind('change', function() {
        var value = this.value.toLowerCase();
        var output = [];

        if (latest !== '')
            window.location.href = '#';

        latest = '';

        if (value.length > 4) {
            var builder = {};

            each(documentation.api, function(item) {
                each(item.properties, function(sub) {
                    if (!search(sub, value))
                        return;
                    if (!builder[item.name])
                        builder[item.name] = [];
                    builder[item.name].push(sub);
                });
                each(item.methods, function(sub) {
                    if (!search(sub, value))
                        return;
                    if (!builder[item.name])
                        builder[item.name] = [];
                    builder[item.name].push(sub);
                });
                each(item.delegates, function(sub) {
                    if (!search(sub, value))
                        return;
                    if (!builder[item.name])
                        builder[item.name] = [];
                    builder[item.name].push(sub);
                });
                each(item.events, function(sub) {
                    if (!search(sub, value))
                        return;
                    if (!builder[item.name])
                        builder[item.name] = [];
                    builder[item.name].push(sub);
                });
            });

            var keys = Object.keys(builder);
            var after = '';

            each(keys, function(key) {
                output.push.apply(output, prepare('api', key, builder[key]));
            });
        }

        if (output.length > 50)
            output = output.splice(0, 50);

        $('#content').html(Tsearch({ members: output }));
        isSearch = true;
    });
});

function search(where, what) {
    var text = where.name.toLowerCase();
    return text.indexOf(what) !== -1;
}

function each(arr, fn) {
    if (!arr)
        return;
    for (var i = 0, length = arr.length; i < length; i++) {
        var item = arr[i];
        fn(item);
    }
};