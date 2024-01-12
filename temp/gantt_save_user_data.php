<?php

require('auth.php');

if( isAuthRequired() ) {
	auth(true);
}

$authScript = "<?php require('auth.php'); if( isAuthRequired() ) { auth(true); } ?>";

if( strlen($_POST['data']) > 0 ) {

	$fileHandle = fopen('gantt_user_data.php','w'); // Saving the JSON file for future use by the web application...
	if( $fileHandle != FALSE ) {
		$status = fwrite( $fileHandle, $authScript . stripslashes( $_POST['data'] ) );
		if( $status != FALSE ) {
   			echo "ok";
		} else {
   			echo "File write error";
		}
		fclose( $fileHandle );
	} else {
		echo "File open error";
	}
	
	$fileHandle = fopen('gantt_user_data.csv.php','w'); // Saving the CSV file for future use by the SP...
	if( $fileHandle != FALSE ) {
		$status = fwrite( $fileHandle, $authScript . "\n" );

		$json = json_decode( ($_POST['data']) );

		// Printing header...
		$keysText = "Code"; 
		foreach( $json[0]->data as $key => $value ) {
			$keysText .= "\t";
			$keysText .= $key;
		}
		$keysText .= "\n";
		fwrite( $fileHandle, $keysText );  

		// Printing data line by line...
		for( $i = 0 ; $i < sizeof($json); $i++ ) { 
			$text = $json[$i]->operationCode;
			foreach( $json[$i]->data as $key => $value ) {
				$text .= "\t";
				$text .= $value;
			}
			$text = preg_replace('/[\r\n]/', chr(1), $text);
			$text = preg_replace('/[\n]/', chr(1), $text);
			$text = preg_replace('/[\r]/', chr(1), $text);
			$text .= "\n";
			fwrite( $fileHandle, $text );
		}
		fclose( $fileHandle );		
	}
} else {
	echo "Post data error";
}
exit();

?>