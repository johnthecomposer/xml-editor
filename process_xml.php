<?php
// be sure to set file permission to writeable
if($_POST['new_xml']){
     $ft = fopen('metas.xml', 'w') or die("Unable to open file.");
     fwrite($ft, $_POST['new_xml']);
     fclose($ft);

     /*
     $simpleXml = simplexml_load_string($_POST['new_xml']);
     // Source: http://stackoverflow.com/questions/798967/php-simplexml-how-to-save-the-file-in-a-formatted-way
     $dom = new DOMDocument('1.0');
     //Format XML to save indented tree
     $dom->preserveWhiteSpace = false;
     $dom->formatOutput = true;
     $dom->loadXML($simpleXml->asXML());
     //Save XML to file
     $dom->save('metas.xml');
     */

     echo 'success! metas saved to file.';
}
?>
