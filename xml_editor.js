/* xml editor */
/*
     notes: xml file must be writeable

     To Do:
          offer text input of xml, translation from string to xml DOM obj
          file upload field, handling
*/

// global variables
var auto_save = true;
var metas = [];
var all_tags = [];
var all_attributes = [];
var all_properties = [];
var look_in = ['url', 'label', 'title', 'description', 'robots'];
var searchstring_found = '';
//var selected_meta = {};
//var selected_meta_id;
var action_type = 'change';
var xml_obj;
var xml_string = '';
var bulk_updated = false;

var empty_obj = {
     url: {'name': 'url','content': '[ url ]','tag': 'meta'},
     title: {'name': 'title','content': '[ title ]','tag': 'meta'},
     description: {'name': 'description','content': '[ description ]','tag': 'meta'},
     robots: {'name': 'robots','content': 'index, follow','tag': 'meta'},
     url_txt: '',
     label: 'label',
     value: ''
}

window.onload = function(){

          // function to call inside ajax callback so that it can update the global variable xml_obj
          // Source: http://stackoverflow.com/questions/905298/jquery-storing-ajax-response-into-global-variable
          function set_global(x){xml_obj = x}
          var loadDataFromXMLFile = function(source_file, update_xml_obj, update_obj){
               $.ajax({
                    url: source_file,
                    type: 'GET',
                    dataType: 'xml',
                    timeout: 1000,
                    error: function(){
                         alert('Error loading XML document');
                    },
                    success: function(xml){
                         set_global(xml);
                         update_xml_obj = xml;
                         //clg('xml')
                         //clg(xml)
                         xmlToObj(update_xml_obj, update_obj, all_properties);
                         //!bulk_updated ? objToObj(metas_AU31, metas) : '';
                         clg('errors');
                         clg(findAndFixErrors(update_obj));
                         clg('update obj')
                         clg(update_obj)
                         multisortArrayOfObjects(update_obj, ['url_txt']);
                         objToXML(update_obj, update_xml_obj);

                         clearFormFields();
                         //clearSelected();
                         setSearchBar();
                         handleForm('#user_form');
                         displayLinks(metas, '/xml_editor', 'urls_list');
                         displayFilterButtons(all_properties, 'filter_buttons_container');

                         $('.little_counter.records').html(metas.length);
                         clg('metas')
                         clg(metas);
                         //displayEditableSearchResults([empty_obj], 'search_results');
                         gid('search_bar').focus();
                    }
               });
          }

          var displayFilterButtons = function(source, container_id){
               var container = $('#' + container_id);
               for(p in source){
                    var filter_button = $('<button></button>').
                         prop('class', 'filter_button ' + source[p]).
                         prop('value', source[p]).
                         text(source[p]).
                         click(function(){
                              var this_prop = $(this).val();
                              var idx = look_in.indexOf(this_prop);
                              var in_look_in = idx !== -1;
                              in_look_in ? look_in.splice(idx, 1) : look_in.push(this_prop);
                              $(this).toggleClass('inactive');
                              $('#search_bar').autocomplete('search', $('#search_bar').val());
                              clg('look_in');
                              clg(look_in)
                         });
                    container.append(filter_button);
               }
          }

          var displayLinks = function(source, domain, container_id){
               for(var s = 0; s < source.length; s++){
                    if(source[s]['url_txt']){
                         var link = $('<a></a>');
                         var edit_me = $('<div></div>').
                              prop('class', 'edit_me').
                              prop('title', 'edit me').
                              text(' <= ').click(function(){
                                   var selected_meta_id = $(this).next().prop('id').replace('meta_id_', '');
                                   var selected = metas[selected_meta_id];
                                   selected['value'] = selected_meta_id;
                                   displayEditableSearchResults(selected, 'search_results');
                              });
                         var url = domain + source[s]['url_txt'];
                         link.prop('href', url).
                              prop('id', 'meta_id_' + s).
                              prop('class', 'url_link').
                              prop('target', '_blank').
                              append(url);
                         $('#' + container_id).append(edit_me, link);
                    }
               }
          }

          // bulk update from JSON - e.g., from converted spreadsheet
          var objToObj = function(new_data, to_update){
               for(n in new_data){
                    var found_this_meta = false;
                    for(u in to_update){
                         if(to_update[u]['url_txt'] === new_data[n]['url_txt']){
                              found_this_meta = true;
                              to_update[u]['title']['content'] = new_data[n]['title'];
                              to_update[u]['description']['content'] = new_data[n]['description'];
                              break;
                         }
                    }
                    if(!found_this_meta){
                         clg('pushing new meta');
                         to_update.push({
                              url_txt: new_data[n]['url_txt'],
                              url: {tag: 'url', text: new_data[n]['url_txt']},
                              title: {tag: 'meta', name: 'title', content: new_data[n]['title']},
                              description: {tag: 'meta', name: 'description', content: new_data[n]['description']},
                              robots: {tag: 'meta', name: 'robots'}
                         });
                    }
               }
               bulk_updated = true;
          }

          var xmlToObj = function(xml_obj, update_obj, properties){
               $(xml_obj).find("mappings").each(function(){
                    var i = 0;
                    $(this).find("mapping").each(function(){
                         update_obj[i] = {};
                         $(this).children().each(function(){
                              var this_tag = $(this).prop('tagName');
                              all_tags.indexOf(this_tag) === -1 ? all_tags.push(this_tag) : '';
                              var this_meta = $(this).attr('name') || '';
                              var this_content = $(this).attr('content') || '';
                              this_meta && all_properties.indexOf(this_meta) === -1 ? all_properties.push(this_meta) : '';
                              var this_text = $(this).text();
/*
                              if(this_tag === 'url'){
                                   update_obj[i]['url_txt'] = this_text;
                                   update_obj[i]['url'] = {};
                                   update_obj[i]['url']['text'] = this_text;
                                   update_obj[i]['url']['tag'] = this_tag;
                              }
*/
                              // Source: http://stackoverflow.com/questions/14645806/get-all-attributes-of-an-element-using-jquery
                              // collect all properties and attributes in the xml file and save them to global variables
                              // if this meta has a name
                              if(this_meta){
                                   update_obj[i][this_meta] = {};
                                   $(this.attributes).each(function(){
                                        //if(this.specified){
                                        if(this.value){
                                             this_text ? update_obj[i][this_meta]['text'] = this_text : '';
                                             update_obj[i][this_meta]['tag'] = this_tag;
                                             update_obj[i][this_meta][this.name] = this.value;
                                             this.name === 'name' && this.value === 'url' ? update_obj[i]['url_txt'] = this_content : '';
                                             all_attributes && all_attributes.indexOf(this.name) === -1 ? all_attributes.push(this.name) : '';
                                        }
                                        //}
                                        //clg('this.name')
                                        //clg(this.name)
                                        //clg('new_property[this_meta][this.name]')
                                        //clg(new_property[this_meta][this.name])
                                   });
                              }
                              //clg('update_obj[i]')
                              //clg(update_obj[i])
                         });
                         i++
                    });
               });
               //clg('all_properties')
               //clg(all_properties)
               //clg('all_attributes')
               //clg(all_attributes)
               clg('new metas obj from xml')
               clg(update_obj)
          }

          var objToXML = function(source, destination){
               // overwrite xml obj with source data
               var mappings = $(destination).find('mappings')[0];
               $(mappings).empty();
               for(s in source){
                    var new_mapping = $('<mapping></mapping>');
                    // Fix: xml namespace is being added to each <mapping>, which is not necessary, as it's been defined at the top
                    for(m in source[s]){
                         if(m !== 'url_txt' && m !== 'label' && m !== 'value'){
                              var new_text = source[s][m]['text'] || '';
                              var new_meta = $('<'+ source[s][m]['tag'] +'>' + new_text + '</'+ source[s][m]['tag'] +'>');
                              var attributes = source[s][m];

                              if(typeof attributes !== 'string'){
                                   for(a in attributes){
                                        if(a !== 'tag' && a !== 'text'){
                                             //clg(a + ': ' + attributes[a])
                                             $(new_meta).attr(a, attributes[a]);
                                        }
                                   }
                              }
                              $(new_mapping).append(new_meta);
                              $(mappings).append(new_mapping);
                         }
                    }
               }
               xml_string = (new XMLSerializer()).serializeToString(destination);
               clg('new xml from obj')
               clg(mappings);
               //clg('metas serialized');
               //clg(xml_string);
          }

     // Source: http://jsfiddle.net/h5E6C/
     var custom_source = function (request, response){
          for(var i = 0; i < metas.length; i++){
               metas[i]['label'] = metas[i]['url_txt'].length > 0 ? metas[i]['url_txt'] : '_global-meta_';
               metas[i]['value'] = i;
          }
          var matcher = new RegExp($.ui.autocomplete.escapeRegex(request.term.trim()), "i");
          response($.grep(metas, function(this_element){
               found = false;
               for(var l = 0; l < look_in.length; l++){
                    var str_to_search = typeof this_element[look_in[l]] === 'string' ? this_element[look_in[l]] : this_element[look_in[l]]['content'];
                    //clg('looking for '+ matcher +' in ' + str_to_search);
                    if(matcher.test(str_to_search)){
                         //clg('matcher.test(str_to_search) is ' + matcher.test(str_to_search))
                         //clg('----------------------------------------------- found '+ matcher +' in ' + str_to_search);
                         found = true;
                         searchstring_found = request.term;
                    }
               }
               return found;
          }));
     }

     var setSearchBar = function(){
          // Source: https://jqueryui.com/autocomplete/
          searchstring_found = '';
          $('#search_bar').autocomplete({
               source: custom_source,
               minLength: 0,
               response: function(event, ui){
                    event.preventDefault();
                    $('#search_results').html('[ search results ]');
                    $('.little_counter.results').html(ui.content.length);
                    displayEditableSearchResults(ui.content, 'search_results');
                    clg('ui content')
                    clg(ui.content)
               },
               /*focus: function(event, ui){
                    event.preventDefault();
                    var idx = ui.item.value === '_global-meta_' ? 0 : ui.item.value;
                    searchstring_found = ui.item.value === '_global-meta_' ? '_global-meta_' : searchstring_found;
               },
               */
               open: function(event){
                    $(".ui-autocomplete").hide();
               }
               /*
               select: function(event, ui){
                    event.preventDefault();
                    var idx = ui.item.value === '_global-meta_' ? 0 : ui.item.value;
                    selected_meta = metas[idx];
                    selected_meta_id = idx;
                    gid('url').focus();
                    //clearFormFields();
               }
               */
          });
     }

     var displayEditableSearchResults = function(these_results, container_id, is_new){
          these_results = Array.isArray(these_results) ? these_results : [these_results];
          clg('called display')
          clg(these_results);
          if(these_results.length === 0){
               $('#' + container_id).html('[ no results ]');
          }
          else{
               $('#' + container_id).html('');
               var lvl = 1;
               for(r in these_results){
                    var this_result = $('<div></div>');
                    $(this_result).
                         prop('id', these_results[r]['value']).
                         prop('class', 'level'); //lvl + '
                    var delete_level_button = $('<button></button>').
                         prop('type', 'button').
                         prop('class', 'delete level').
                         html('x');
                    this_result.append(delete_level_button);

                    for(e in these_results[r]){
                         if(typeof these_results[r][e] === 'object'){
                              //clg('property: ' + e);
                              var this_field = $('<div></div>').prop('class', e);
                              var delete_field_button = $('<button></button>').
                                   prop('class', 'delete field').
                                   html('x');
                              this_field.append(delete_field_button);

                              var this_label = $('<span>' + e + '</span>');
                              this_label.prop('class', 'fieldlabel ' + e);

                              var this_editable = $('<span></span>');
                              this_editable.prop('class', e + ' is_editable');
                              var this_input = $('<input></input>').
                                   prop('class', 'inactive').
                                   keypress(function(event){
                                        if(event.which === 13){
                                             clg('pressed enter');
                                             event.preventDefault();
                                             $(this).blur();
                                             return false;
                                        }
                                   });
                              this_input.blur(function(){
                                   if(auto_save){
                                        var newval = $(this).val();
                                        var target_meta = getMetasElementToEdit($(this));
                                        this_prop = $(this).parent().parent().prop('class');
                                        target_meta[this_prop]['content'] = newval;
                                        this_prop === 'url' ? target_meta['url_txt'] = newval : '';
                                        $(this).prev().text(newval);
                                        //clg('target meta')
                                        //clg(target_meta);
                                        clg('edited metas')
                                        clg(metas)
                                   }
                                   $(this).parent().children().toggleClass('active');
                                   $(this).parent().children().toggleClass('inactive');
                              });
                              if(searchstring_found === '_global-meta_'){
                                   //clg('searchstring found is global meta');
                                   this_editable.append(isolateSearchString(searchstring_found, 'url: _global-meta_'));
                                   this_input.val('url: _global-meta_');
                              }
                              else if(typeof these_results[r][e]['content'] !== 'undefined'){
                                   //clg(searchstring_found + ' was found in ' + these_results[r][e]['content'])
                                   this_editable.append(isolateSearchString(searchstring_found, these_results[r][e]['content']));
                                   this_input.val(these_results[r][e]['content']);
                              }
                              else{
                                   // error
                              }
                         this_result.append(this_field);
                         this_field.append(this_label);
                         this_field.append(this_editable);
                         this_editable.append(this_input);
                         }
                    $('#' + container_id).append(this_result);
                    $('#' + container_id).prop('class', e);
                    }
               lvl++
               }
               var new_field = $('<div></div>').
                    prop('class', 'new_property');
               var add_property = $('<button></button>').
                    prop('type', 'button').
                    prop('class', 'add property').
                    prop('value', 'add_property').
                    text('+').click(function(){
                         if(typeof $(this).next().prop('id') === 'undefined'){
                              var this_meta = getMetasElementToEdit($(this));
                              clg('this_meta');
                              clg(this_meta);
                              //clg('all properties');
                              //clg(all_properties);
                              var properties_form = $('<form></form>').
                                   prop('action', '#').
                                   prop('id', 'properties');
                                   for(p in all_properties){
                                        if(typeof this_meta[all_properties[p]] === 'undefined'){
                                             var radio_label = $('<label></label>').
                                                  prop('for', all_properties[p]).
                                                  text(all_properties[p]).click(function(){
                                                       $(this).prev().trigger('click');
                                                  });
                                             var radio = $('<input></input>').
                                                  prop('type', 'radio').
                                                  prop('name', 'property_to_add').
                                                  prop('value', all_properties[p]).
                                                  click(function(){
                                                       //var this_meta = metas[$(this).parent().parent().parent().prop('id')];
                                                       var property_name = $(this).val();
                                                       this_meta[property_name] = {
                                                            content: '[ ' + property_name + ' ]',
                                                            name: property_name,
                                                            tag: 'meta'
                                                       }
                                                       displayEditableSearchResults(this_meta, 'search_results');
                                                  });
                                             properties_form.append(radio,radio_label);
                                        }
                                   }
                                   var new_field = $('<input></input>').
                                        prop('type', 'text').
                                        prop('id', 'new_property_name').
                                        prop('placeholder', '[ new property ]').
                                        blur(function(){
                                             // test for valid property name
                                             var invalid_characters = new RegExp(/[^a-z]/, 'g');
                                             var invalid = invalid_characters.test($(this).val().toLowerCase());
                                             clg('invalid? ' + invalid);


                                             var property_name = $(this).val().toLowerCase().replace(invalid_characters, '');
                                             this_meta[property_name] = {
                                                  content: '[ ' + property_name + ' ]',
                                                  name: property_name,
                                                  tag: 'meta'
                                             }
                                             displayEditableSearchResults(this_meta, 'search_results');
                                        });
                              properties_form.append(new_field);
                              $(this).after(properties_form);
                         }
                    });
               new_field.append(add_property);
               this_result.append(new_field);
               handleForm('#user_form');
          }
     }

     var isolateSearchString = function(search_string, source){
          isolated = false;
          var start = source.toLowerCase().indexOf(search_string.toLowerCase());
          var end = source.toLowerCase().indexOf(search_string) + search_string.length;
          if(start !== -1){
               isolated = true;
          }
          var fieldval = $('<span></span>').prop('class', 'fieldval active');
          fieldval.click(function(){
               var fieldwidth = $(this).parent().width();
               $(this).parent().children().toggleClass('active');
               $(this).parent().children().toggleClass('inactive');
               $(this).parent().children('.active').width(fieldwidth).focus();
          });
          var foundstr = $('<span></span>').prop('class', 'highlighted_searchstring').text(source.slice(start, end));

          if(isolated){
               fieldval.append(source.slice(0, start));
               fieldval.append(foundstr);
               fieldval.append(source.slice(end));
          }
          else{
               fieldval.append(source);
          }

          return fieldval;
     }

     var findAndFixErrors = function(source){
          var all_urls_txt = [];
          var all_urls = [];
          var errors = {
               mismatched_urls: {},
               duplicate_urls: [],
               illegal_characters: []
          }
          // urls --> 404

          // mismatched urls between url and url meta
          for(var i = 0; i < source.length; i++){
               var this_meta = source[i];
               //encodeURIComponent();
               if(this_meta['url_txt'] !== this_meta['url']['content']){
                    /*errors['mismatched_urls'][i] = {
                         url: this_meta['url_txt'],
                         url_meta: this_meta['url']['content']
                    }
                    */
                    this_meta['url']['content'] = this_meta['url_txt'];
               }

/*
               // duplicate urls in document
               if(all_urls_txt.indexOf(this_meta['url_txt']) === -1){
                    all_urls_txt[i] = this_meta['url_txt'];
               }
               else{
                    errors['duplicate_urls'][i] = this_meta['url_txt'];
               }
               if(all_urls.indexOf(this_meta['url']['content']) === -1){
                    all_urls[i] = this_meta['url']['content'];
               }
               else{
                    errors['duplicate_urls'][i] = this_meta['url']['content'];
               }
*/
          }
          return errors;
     }

     var getMetasElementToEdit = function(this_element){
          var elm;
          if(this_element.hasClass('level')){
               elm = metas[this_element.parent().prop('id')];
          }
          else if(this_element.hasClass('field')){
               elm = metas[this_element.parent().parent().prop('id')][this_element.parent().prop('class')];
          }
          else if(this_element.hasClass('add')){
               elm = metas[this_element.parent().parent().prop('id')];
          }
          else if(this_element.hasClass('active')){
               elm = metas[this_element.parent().parent().parent().prop('id')];
          }
          else{
               // error
          }
          return elm;
     }

     /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ handle form ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */

     var clearFormFields = function(){
          $('#search_bar').val();
          $('.little_counter.results').html(0);
          $('#search_results').html('[ search results ]');
     }

     var refreshView = function(){
          setSearchBar();
          clearFormFields();
          displayLinks(metas, '/xml_editor', 'urls_list');
     }

     var textFieldsAreEmpty = function(classname){
          var is_empty = true;
          $(".meta_property").each(function(){
               if($(this).val().length > 0){
                    is_empty = false;
                    return is_empty
               }
          });
          return is_empty
     }

     var handleForm = function(form_id){
          $('#search_bar').focus(function(){
               //clg('focused on search')
               //clearSelected();
               //clearFormFields();

          });
          $('#search_bar').keyup(function(){
               !$(this).val() ? $('#search_results').html('[ please use the search bar above ]') : '';
          });
          $('.fieldlabel').click(function(){
               $(this).next().click();
          });
          $('button.delete').click(function(event){
               clg(event);
               //event.preventDefault();
               var elm_to_edit = getMetasElementToEdit($(this));
               var repl = new RegExp(/"/, 'g');
               var to_delete_msg = JSON.stringify(elm_to_edit, null, 7).replace(repl, '');//typeof elm_to_edit['url_txt']
               var cnf = confirm('Are you sure you want to delete\n\n' + to_delete_msg + '\n\n?');
               if(cnf){
                    if($(this).hasClass('level')){
                         metas.splice(elm_to_edit, 1);
                         $('#search_results').html('[ search results ]');
                    }
                    else if($(this).hasClass('field')){
                         delete elm_to_edit;
                         displayEditableSearchResults(metas[$(this).parent().parent().prop('id')], 'search_results');
                    }
                    else{
                    }
               clg(metas);
               }
          });
          $('.new.record').click(function(){
               metas.push(empty_obj);
               metas[metas.length - 1]['value'] = metas.length - 1;
               displayEditableSearchResults(metas[metas.length - 1], 'search_results');
               clg(metas)
          });
/*
          $('input[type=submit]').click(function(event){
               event.preventDefault();
               clg('clicked submit');
               var posting = $.post($(this).attr( "action" ));
               posting.done(function(server_response){
                    // reload data from server
                    //loadDataFromXMLFile('metas.xml', xml_obj, metas);
                    clg(server_response);
               });
          });

          $('#save').click(function(){
               clg('clicked save')
              $('.level').each(function(){
                    var to_edit = metas[$(this).prop('id')];
                    $(this).children().each(function(){
                         var fieldname = $(this).classList;
                         $(this).children('fieldval').each(function(){
                              var fieldval = $(this).val();
                              to_edit[fieldname] = $(this).val();
                              clg('editing ' + fieldname + ' value ' + fieldval)
                         });
                    });

               });
               clg('edited metas');
               clg(metas);

          });
*/
          /* ~~~~~~~~~~~~~~~~~~~~~~~ update data ~~~~~~~~~~~~~~~~~~~~~~~ */
          $('#save_to_file').click(function(event){
               clg('save clicked');

               // Stop form from submitting normally
               event.preventDefault();

               // sort by url
               multisortArrayOfObjects(metas, ['url_txt']);

               // update the xml object from the sorted metas object
               objToXML(metas, xml_obj);

               // save to file
               writeToFile($(this).prop('action'), {data: xml_string, save_to_filename: "xml_editor/metas.xml"});
          });
     /* ~~~~~~~~~~~~~~~~~~~~~~~ write to file ~~~~~~~~~~~~~~~~~~~~~~~ */
          /* write to file */
          var writeToFile = function(url, data){
               // node.js implementation
     //          var posting = $.post(url, {data: xml_string, save_to_filename: "xml_editor/metas.xml"});
               var posting = $.post(url, data);
               posting.done(function(server_response){
                    clg('server response')
                    clg(server_response)
                    // reload data from server
                    loadDataFromXMLFile('metas.xml', xml_obj, metas);
                    clg(server_response)
                    //clg('new xml: ')
                    //clg(xml_obj)
               });
          }

          var dialog = function(action){
                    $(".ui-button-text").text('x');
                    var action_button = action;
                    var mydialog = $("#dialog").dialog({
                         resizable: false,
                         modal: true,
                         title: action,
                              height: 500,
                              width: 500,
                         buttons: {
                              action_button: function(){
                                   writeToFile('/xml_editor', {data: $('#xml_input').val(), save_to_filename: "xml_editor/metasImport.xml"});
                              },
                              show_buttons: function(){
                                   clg(this);
                              }
                         },

                         //close: function(){}
                    });
                    $("#dialog").show();
          }

          $('.dialog').click(function(){
               dialog($(this).prop('id'));
          });
     }
     loadDataFromXMLFile('metas.xml', xml_obj, metas);
}
