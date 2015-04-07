
define([ "jquery", "vo" ], function( $, vo ) {

    const FOLDER_NAME = "favorites";

    var fs, curURI;

    errorHandler = function( error ) {
        console.error( "File Operations error.", error );
    }

    createFavFolder = function( errorBack ) {
        fs.root.getDirectory( FOLDER_NAME , { create: true }, function( dirEntry ) {
            console.log( "You have just created the " + dirEntry.name + " directory." );
        }, errorBack );
    }

    dataURItoBlob = function ( dataURI ) {
        // convert base64 to raw binary data held in a string
        var byteString = atob( dataURI.split(',')[1] );

        // separate out the mime component
        var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]

        // write the bytes of the string to an ArrayBuffer
        var ab = new ArrayBuffer( byteString.length );
        var ia = new Uint8Array( ab );
        for ( var i = 0; i < byteString.length; i++ ) {
            ia[i] = byteString.charCodeAt(i);
        }

        var blob = new Blob( [ia], { type: "image/jpg" });
        return blob;
    }

    getDataURI = function( url ) {
        var img = new Image(),
            def = $.Deferred();

        img.onload      = onload;
        img.onerror     = errored;
        img.onabort     = errored;
        img.crossOrigin = "*";
        img.src         = url;

        function onload() {
            unbindEvent();

            var canvas    = document.createElement( "canvas" );
            canvas.width  = img.width;
            canvas.height = img.height;
            canvas.getContext( "2d" ).drawImage( img, 0, 0 );

            def.resolve( canvas.toDataURL( "image/jpeg" ));
        };

        function errored ( error ) {
            unbindEvent();
            def.reject( error );
        }

        function unbindEvent() {
            img.onload  = null;
            img.onerror = null;
            img.onabort = null;
        }

        return def.promise();
    }

    return {
        Init: function( errorBack ) {
            window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
            window.requestFileSystem( window.TEMPORARY , 52428800, function( fileEntry ) {
                fs = fileEntry;
                console.log( "File init complete.", fs );
                createFavFolder( errorBack );
            }, errorBack );
        },

        Add: function( file_name, uri ) {

            var path = file_name == vo.constructor.BACKGROUND ? file_name : FOLDER_NAME + "/" + file_name + ".jpg";
            var def  = $.Deferred();

            fs.root.getFile( path, { create : true },
                function( fileEntry ) {
                    fileEntry.createWriter( function( fileWriter ) {

                        console.log("fileEntry.toURL() = " + fileEntry.toURL())

                        fileWriter.onwritestart  = function(e) { def.notify( e ); };
                        fileWriter.onprogress    = function(e) { def.notify( e ); };
                        fileWriter.onwriteend    = function(e) { def.resolve( e ); };
                        fileWriter.onabort       = function(e) { def.reject( e ); };
                        fileWriter.onerror       = function(e) { def.reject( e ); };

                        fileWriter.write( dataURItoBlob( uri ));

                    }, function( error ) {
                        console.log( "Save background fail, error is", error )
                        def.reject( error );
                    });
                },
                function( error ) {
                        console.log( "Get background fail, error is", error )
                        def.reject( error );
                });

            return def.promise();
        },

        Delete: function( file_name, callback, errorBack ) {

            fs.root.getDirectory( FOLDER_NAME, {}, function( dirEntry ) {
                var dirReader = dirEntry.createReader();
                var is_del    = false;
                dirReader.readEntries(function( entries ) {
                    for( var i = 0; i < entries.length; i++ ) {
                      var entry = entries[i];
                      if ( entry.isDirectory ) {
                        console.log("Directory: " + entry.fullPath );
                      }
                      else if ( entry.isFile ) {
                        console.log("File: " + entry.fullPath );
                        if ( file_name + ".jpg" == entry.name ) {
                            is_del = true;
                        }
                      }
                    }
                    if ( is_del ) {
                        entry.remove(function() {
                            console.log( "File successufully removed." );
                            callback( file_name );
                        }, errorBack );
                    }
                    else {
                        console.error( "Not found delete favorite background in filesystem, id is " + file_name );
                        callback( file_name );
                    }
                 }, errorBack );
            }, errorBack );
        },

        List: function( callback ) {
            fs.root.getDirectory( FOLDER_NAME, {}, function( dirEntry ) {
            var dirReader = dirEntry.createReader();
            var name_arry = [];
            dirReader.readEntries(function( entries ) {
                for( var i = 0; i < entries.length; i++ ) {
                  var entry = entries[i];
                  if ( entry.isDirectory ) {
                    console.log("Directory: " + entry.fullPath );
                  }
                  else if ( entry.isFile ) {
                    console.log("File: " + entry.fullPath );
                    name_arry.push( entry.name.replace( ".jpg", "" ) );
                  }
                }
                callback( name_arry );
              }, errorHandler );
            }, errorHandler );
        },

        DataURI: function( result ) {
            return curURI = curURI || result;
        },

        GetDataURI : getDataURI,

    }
});