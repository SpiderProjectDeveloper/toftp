<?php


$downloadFile = 'download.ini';
/*
$downloadTime = 0;	// The last time "gantt_user_data.php" was loaded into Spider Project...
$fileHandle = fopen( $downloadFile, 'r' ); 			// .. opening "download.ini" file...
if( $fileHandle != FALSE ) {						// ... if succeeded ...
	while( !feof( $fileHandle ) ) {					// ... searching for and reading the "download.ini" line
		$line = fgets( $fileHandle );
		$explodedLine = explode( '=', $line );
		if( strtolower( $explodedLine[0] ) == 'loaded' ) {
			if( strlen( $explodedLine[1] ) > 0 ) {
				$downloadTime = (int)$explodedLine[1];
			}
			break;
		}
	}
	fclose( $fileHandle );					
}
*/
$downloadFileModTime = 0;
if( file_exists($downloadFile) ) {
	$downloadFileModTime = filemtime($downloadFile);
	if( $downloadFileModTime == FALSE ) {
		$downloadFileModTime = 0;
	}
}


$userDataFile = 'gantt_user_data.csv.php';
$userDataFileModTime = 0;
if( file_exists($userDataFile) ) {
	$userDataFileModTime = filemtime($userDataFile);
	if( $userDataFileModTime == FALSE ) {
		$userDataFileModTime = 0;
	}
} 

$synchronized = 1;
if( $userDataFileModTime > $downloadFileModTime ) {
	$synchronized = 0;
}

$returnStr = '{"synchronized":' . $synchronized . '}';
echo($returnStr); 		// Sending data to client via http.

exit(0);

?>