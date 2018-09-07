$servername = "localhost";
$username   = "root";
$password   = "root";

class CPrinters{
	$ip      = array();
    $port    = array();
    $apikey  = array();
	$camPort = array();
}


function loadPrintersData(){
	$printers = new CPrinters;
	
	$link = mysql_connect($servername, $username, $password);
	mysql_select_db($dbname , $link);
	
	$sql = 'SELECT * FROM printers';
	
	$result = mysql_query($sql, $link) or die(mysql_error());
	if($result){
		$rows = mysqli_num_rows($result);
		for ($i=$rows;$i--;){
			$printers[] = new CPrinters();
		}
		for ($i=0;$i<$rows;++$i){
			
			$row = mysqli_fetch_row($result);
			// Обработка строки
			//$printers.$ip[$i] = 
		}
		mysqli_free_result($result);
	}
	mysqli_close($sql);
	return;
}

function savePrintersData(){

}

function deletePrinterData(){
	
}

