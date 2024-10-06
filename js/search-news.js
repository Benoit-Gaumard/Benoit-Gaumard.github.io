---
---

    function search() {
        var input = $("#search-input").val().toLowerCase();

        var results = searchData.filter(function (e) {
            return e.content.includes(input);
        }).map(function (e) {
            return e.url;
        });

        $(".blog-post").each(function () {
            var finding = results.includes($(this).data('url'));
            $(this).toggle(finding);
            if (finding) {
                if (input == '') {
                    ($(this).find("a")[0]).innerText = "Lire";
                } else {
                    var count = searchData.filter(e => e.url == $(this).data('url'))[0].content.match(new RegExp(input, 'g')).length;
                    ($(this).find("a")[0]).innerText = "Lire " + count + " news";
                }
                var param = encodeURI(input);
                ($(this).find("a")[0]).href = "{{ site.url }}" + $(this).data('url') + "?search=" + param;
            }
        });
    }

$("#search-input").on('input', search);
