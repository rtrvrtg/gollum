/**
 *  gollum.preview.js
 *  A jQuery plugin that creates the Gollum Preview.
 *
 *  Usage:
 *  $.GollumPreview(); on DOM ready.
 */
(function($) {

  // Editor options
  var DefaultOptions = {
    MarkupType: 'markdown',
    EditorMode: 'code',
    Debug: false,
    NoDefinitionsFor: [],
    MarkupSource: null,
    PreviewTarget: null
  };
  var ActiveOptions = {};
  var rendererDefinitions = {};

	$.GollumPreview = function(IncomingOptions) {
    ActiveOptions = $.extend(DefaultOptions, IncomingOptions);

    var renderTimeout, prevTime, elapsedTime, oldContent, formatSelector;

    var formatSelectorInstance = new FormatSelector(
      $,
      $('#gollum-editor-format-selector select'),
      function(newValue){
        ActiveOptions.MarkupType = newValue;
        buildPreview(true);
      }
    );

    var applyTimeout = function() {
      if (renderTimeout) {
        clearTimeout(renderTimeout);
        renderTimeout = undefined;
      }

      // 3 second max delay
      if (elapsedTime > 3000) {
        elapsedTime = 3000;
      }

      renderTimeout = setTimeout(buildPreview, elapsedTime);
    };

    var getEditorContent = function(){
      var content = "";
      if (!!ActiveOptions.MarkupSource) {
        content = ActiveOptions.MarkupSource.val();
      }
      return content;
    };

    var buildPreview = function(forceRender){
      if (!forceRender) forceRender = false;

      var text = getEditorContent();

      if (!forceRender) {
        if (text == undefined || text == '') {
          // Render empty preview pane.
          Displayer.setPreview('');
          return;
        }

        if (text && text == oldContent) {
          // No need to re-render, just return.
          return;
        }
        else {
          oldContent = text;
        }
      }

      prevTime = (new Date().getTime());

      // Perform our conversion and display here.
      Renderer.render(text);
    };

    var Renderer = {
      hasLocalRenderer: function(){
        return !!rendererDefinitions[ActiveOptions.MarkupType];
      },
      render: function(markup){
        var callback = function(rendered){
          Displayer.setPreview(rendered);

          // Calculate the processing time of the HTML creation.
          // It's used as the delay time in the event listener.
          elapsedTime = (new Date().getTime()) - prevTime;
        };

        if (this.hasLocalRenderer()) {
          this.renderLocal(markup, callback);
        }
        else {
          this.renderRemote(markup, callback);
        }
      },
      renderLocal: function(markup, callback) {
        var currentRenderDef = rendererDefinitions[ActiveOptions.MarkupType];
        require([currentRenderDef.path()], function(rendererObj){
          var html = currentRenderDef.render(rendererObj, markup);
          callback(html);
        });
      },
      renderRemote: function(markup, callback) {
        $.ajax({
          url: "../fragments",
          type: "POST",
          accepts: "json",
          data: {
            fragments: [markup],
            page: "Preview",
            format: ActiveOptions.MarkupType
          }
        }).done(function(data, textStatus, jqXhr){
          var rendered = "";
          for (var i = 0; i < data.length; i++) {
            rendered = data[i].destination;
          }
          callback(rendered);
        });
      }
    };

    var Displayer = {
      chosenPreview: null,
      setPreview: function(markup) {
        if (this.chosenPreview) {
          this.chosenPreview(markup);
          return;
        }

        try {
          this.optimalPreview(markup);
          chosenPreview = this.optimalPreview;
        } catch ( e ) {
          this.fallbackPreview(markup);
          chosenPreview = this.fallbackPreview;
        }
      },
      optimalPreview: function(markup) {
        ActiveOptions.PreviewTarget.get(0).innerHTML = markup;
      },
      fallbackPreview: function(markup) {
        // IE doesn't let you use innerHTML if the element is contained somewhere in a table
        // (which is the case for inline editing) -- in that case, detach the element, set the
        // value, and reattach. Yes, that *is* ridiculous.

        var content = ActiveOptions.PreviewTarget.get(0);

        var parent = content.parentNode;
        var sibling = content.nextSibling;

        parent.removeChild(content);
        content.innerHTML = markup;

        if (!sibling) {
          parent.appendChild(content);
        }
        else {
          parent.insertBefore(content, sibling);
        }
      }
    };

    // Bind editor and set up default content
    ActiveOptions.MarkupSource.bind('change keyup', applyTimeout);
    buildPreview();
  };

  $.GollumPreview.defineRenderer = function(language, options){
    rendererDefinitions[language] = options;

    rendererDefinitions[language].path = function(){
      return '../javascript/editor/parsers/' + language + '/' + this.source;
    };

    rendererDefinitions[language].render = function(container, markup){
      if (!container) {
        container = window
      };

      var runSplit = this.runner.split(".");
      var func = container;
      var referencePoint = null;
      
      for (var i = 0; i < runSplit.length; i++) {
        func = func[runSplit[i]];
        if (i == 0) {
          var referencePoint = func;
        }
      }

      return func.call(referencePoint, markup);
    };
  };

})(jQuery);
