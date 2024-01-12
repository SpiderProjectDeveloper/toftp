#include <windows.h>
#include <wininet.h>
#include <string.h>
#include <string>
#pragma comment(lib, "Wininet")
#include "ftp.h"

#define FTP_MAX_SERVER 100
static wchar_t _server[FTP_MAX_SERVER + 1];

#define FTP_MAX_USER 100
static wchar_t _user[FTP_MAX_USER + 1];

#define FTP_MAX_PASSWORD 100
static wchar_t _password[FTP_MAX_PASSWORD + 1];

#define FTP_MAX_REMOTE_ADDR 500
static wchar_t _remoteAddr[FTP_MAX_REMOTE_ADDR + 1];

static unsigned long _port;

static long int _ftpErrorCode = 0;
static DWORD _winInetErrorCode = 0;
static wchar_t *_winInetErrorText = NULL;

static long int _timeOut = -1L;

static HINTERNET _hInternet = NULL;
static HINTERNET _hFtpSession = NULL;

static int validateDirectories(wchar_t *);
static bool dstDirIsValidated=false;

static bool findCharsInString(wchar_t* str, wchar_t *chars);

static int createRemoteAddr(wchar_t *fileName, wchar_t *directory, wchar_t *server, wchar_t *user, wchar_t *password)
{
	if( server != NULL && user != NULL && password != NULL ) {	
		if (wcslen(server) + wcslen(user) + wcslen(password) + wcslen(directory) + wcslen(fileName) + 7 >= FTP_MAX_REMOTE_ADDR) {
			return -1;
		}
		wcscpy(_remoteAddr, L"ftp://");
		wcscpy(_remoteAddr, user);
		wcscpy(_remoteAddr, L":");
		wcscpy(_remoteAddr, password);
		wcscpy(_remoteAddr, L"@");
		wcscpy(_remoteAddr, server);
		wcscpy(_remoteAddr, directory);
		wcscpy(_remoteAddr, L"/");
		wcscpy(_remoteAddr, fileName);
	} else {
		int directoryLength = wcslen(directory);
		int fileNameLength = wcslen(fileName);
		if (directoryLength + fileNameLength + 1 >= FTP_MAX_REMOTE_ADDR) {
			return -1;
		}
		wcscpy(_remoteAddr, directory);
		if (directoryLength > 0) {
			if (_remoteAddr[directoryLength - 1] != '/') {
				wcscat(_remoteAddr, L"/");
			}
		}
		wcscat(_remoteAddr, fileName);					
	}
	return 0;
}



int ftpTest(wchar_t *fileName, wchar_t *directory, unsigned long int *size)
{
	_ftpErrorCode = 0;
	_winInetErrorCode = 0;

	return 1;
}


int ftpDelete(wchar_t *dstFileName, wchar_t *dstDirectory ) 
{
	_ftpErrorCode = 0;
	_winInetErrorCode = 0;

	if (createRemoteAddr(dstFileName, dstDirectory, NULL, NULL, NULL) == -1) {
		_ftpErrorCode = FTP_ERROR_TOO_LONG_CREDENTIALS;
	} else {
		int lastCharIndex = wcslen(_remoteAddr) - 1;
		if( _remoteAddr[lastCharIndex] != L'*' ) { 		// Deleting a file by name...
			if( !FtpDeleteFileW(_hFtpSession, _remoteAddr) ) {
				_ftpErrorCode = FTP_ERROR_FAILED_TO_DELETE_REMOTE;				
			}
		} else { 		// Deleting by template '*'
			// This is to delete the ".htaccess" file if a server does not allow to find it
			wchar_t htaccessFile[FTP_MAX_REMOTE_ADDR + 1 + MAX_PATH];
			wcscpy(htaccessFile, _remoteAddr);
			htaccessFile[lastCharIndex] = '\x0';
			wcscat( htaccessFile, L".htaccess" );
			//MessageBoxW( NULL, fileToDelete, L"FILE TO DELETE", MB_OK );
			FtpDeleteFileW(_hFtpSession, htaccessFile);
			// ".htaccess" is deleted...

			WIN32_FIND_DATAW fd;
			HINTERNET hFtpSession = InternetConnectW(_hInternet, _server, 
				INTERNET_DEFAULT_FTP_PORT, _user, _password, INTERNET_SERVICE_FTP, INTERNET_FLAG_PASSIVE, 0);
			if (hFtpSession) {
				HINTERNET hFind = FtpFindFirstFileW(hFtpSession,_remoteAddr,&fd,0,0);
				if( hFind ) {
					bool findNext;
					do {
						if( fd.dwFileAttributes != FILE_ATTRIBUTE_DIRECTORY ) {
							wchar_t fileToDelete[FTP_MAX_REMOTE_ADDR + 1 + MAX_PATH];
							wcscpy(fileToDelete, _remoteAddr);
							fileToDelete[lastCharIndex] = '\x0';
							wcscat( fileToDelete, fd.cFileName );
							//MessageBoxW( NULL, fileToDelete, L"FILE TO DELETE", MB_OK );
							if( !FtpDeleteFileW(_hFtpSession, fileToDelete) ) {
								_ftpErrorCode = -1;
							}
						}
						findNext = InternetFindNextFileW(hFind, &fd);
					} while( findNext );
					InternetCloseHandle(hFind);
				}
				InternetCloseHandle(hFtpSession);
			} else {
				_ftpErrorCode = FTP_ERROR_FAILED_TO_DELETE_REMOTE;
			}
			if( _ftpErrorCode == 0 ) { 	// All the files were deleted, thus deleting the directory that is empty now...
				wchar_t dirToDelete[FTP_MAX_REMOTE_ADDR + 1];
				wcscpy( dirToDelete, _remoteAddr );
				dirToDelete[lastCharIndex] = L'\x0';
				dirToDelete[lastCharIndex-1] = L'\x0';
				//MessageBoxW( NULL, dirToDelete, L"DIR TO DELETE", MB_OK );
				if( wcslen(dirToDelete) > 0 ) {
					if( !FtpRemoveDirectoryW(_hFtpSession, dirToDelete) ) {
						_ftpErrorCode = FTP_ERROR_FAILED_TO_DELETE_REMOTE;				
					}
				}
			}
		}
	}
	return _ftpErrorCode;
}


int ftpUpload(wchar_t *srcFileName, wchar_t *dstFileName, wchar_t *dstDirectory, bool createDstDirIfNotExists)
{
	_ftpErrorCode = 0;
	_winInetErrorCode = 0;

	if (createRemoteAddr(dstFileName, dstDirectory, NULL, NULL, NULL) == -1) {
		_ftpErrorCode = FTP_ERROR_TOO_LONG_CREDENTIALS;
	} else {
		int directoryValidated = false;
		if (!createDstDirIfNotExists && !findCharsInString(dstFileName, L"/\\")) {
			directoryValidated = true;
		} else if( dstDirIsValidated && !findCharsInString(dstFileName, L"/\\") ) {
			directoryValidated = true;
		}
		else {
			if (validateDirectories(_remoteAddr) >= 0) {
				directoryValidated = true;
			}
		}
		if( directoryValidated ) {
			DWORD status = FtpPutFileW(_hFtpSession, srcFileName, _remoteAddr, FTP_TRANSFER_TYPE_BINARY, 0);
			if (!status) {
				_ftpErrorCode = FTP_ERROR_FAILED_TO_WRITE_REMOTE;
			}
		} else {
			_ftpErrorCode = FTP_ERROR_FAILED_TO_WRITE_REMOTE_DUE_TO_SUBDIR_ERROR;			
		}
	}
	return _ftpErrorCode;
}


int ftpDownload(wchar_t *dstFileName, wchar_t *srcFileName, wchar_t *srcDirectory ) 
{
	_ftpErrorCode = 0;
	_winInetErrorCode = 0;

	if (createRemoteAddr(srcFileName, srcDirectory, NULL, NULL, NULL) == -1) {
		_ftpErrorCode = FTP_ERROR_TOO_LONG_CREDENTIALS;
	} else {
		//MessageBoxW(NULL, _remoteAddr, L"R", MB_OK );
		int status = FtpGetFileW(_hFtpSession, _remoteAddr, dstFileName, false, FILE_ATTRIBUTE_NORMAL, FTP_TRANSFER_TYPE_BINARY, 0); 
		if( !status ) {
			_ftpErrorCode = FTP_ERROR_FAILED_TO_READ_REMOTE;
		}
	}
	return _ftpErrorCode;
}


int ftpDir( wchar_t *dstFileMask, wchar_t *dstDirectory, std::wstring &dest ) 
{
	_ftpErrorCode = 0;
	_winInetErrorCode = 0;

	if (createRemoteAddr(dstFileMask, dstDirectory, NULL, NULL, NULL) == -1) {
		_ftpErrorCode = FTP_ERROR_TOO_LONG_CREDENTIALS;
	} else {
		WIN32_FIND_DATAW fd;
		HINTERNET hFind = FtpFindFirstFileW(_hFtpSession,_remoteAddr,&fd,0,0);
		/*		
		DWORD err = GetLastError();
		wchar_t buf[502];
		wchar_t buf2[402];
		DWORD buf2len=400;
 		InternetGetLastResponseInfoW(&err, buf2, &buf2len );
		swprintf( buf, L"Error: %d\n %s", err, buf2 );
		MessageBoxW( NULL, buf, L"Error", MB_OK );
		*/		
		if( hFind ) {
			bool findNext;
			do {
				if( fd.dwFileAttributes != FILE_ATTRIBUTE_DIRECTORY ) {
					if( dest.length() > 0 ) {
						dest += L",";
					}
					dest += fd.cFileName;
				}
				findNext = InternetFindNextFileW(hFind, &fd);
			} while( findNext );
			InternetCloseHandle(hFind);
		} 
		//else {
		//	_ftpErrorCode = FTP_ERROR_FAILED_TO_CONNECT;
		//}
	}
	return _ftpErrorCode;
}


void ftpSetTimeOut(unsigned long int timeOut) {
	_ftpErrorCode = 0;
	_winInetErrorCode = 0;

	_timeOut = timeOut;
}


int ftpSetCredentials(wchar_t *server, wchar_t *user, wchar_t *password, int port) {
	_ftpErrorCode = 0;
	_winInetErrorCode = 0;

	if( wcslen(server) > FTP_MAX_SERVER || wcslen(user) > FTP_MAX_USER || wcslen(password) > FTP_MAX_PASSWORD ) {
		_ftpErrorCode = -1;
	} else {
		wcscpy( _server, server );
		wcscpy( _user, user );
		wcscpy( _password, password );
		if( port < 0 ) {
			_port = INTERNET_DEFAULT_FTP_PORT;
		} else {
			_port = port;					
		}
	}
	return _ftpErrorCode;
}


int ftpInit(void) {
	_ftpErrorCode = 0;
	_winInetErrorCode = 0;

	dstDirIsValidated = false; 

	_hInternet = InternetOpenW(NULL, INTERNET_OPEN_TYPE_DIRECT, NULL, NULL, 0);
	if (!_hInternet) {
		_ftpErrorCode = FTP_ERROR_FAILED_TO_OPEN_INTERNET;
	} else {
		_hFtpSession = InternetConnectW(_hInternet, _server, _port, _user, _password, INTERNET_SERVICE_FTP, INTERNET_FLAG_PASSIVE, 0);
		if (!_hFtpSession) {
			_ftpErrorCode = FTP_ERROR_FAILED_TO_CONNECT;
		} 
	}

	if( _ftpErrorCode != 0 ) {
		ftpClose(false);
	}

	return _ftpErrorCode;
}


void ftpClose( bool resetErrors ) {
	if( resetErrors ) {
		_ftpErrorCode = 0;
		_winInetErrorCode = 0;
	}

	if( _hFtpSession != NULL ) {
	    InternetCloseHandle(_hFtpSession);
	}
	_hFtpSession = NULL;
	if( _hInternet != NULL ) {
	    InternetCloseHandle(_hInternet);
	}
	_hInternet = NULL;
}


int ftpGetLastError(int *ftpErrorCode, DWORD *winInetErrorCode, wchar_t *winInetErrorText) {
	if (ftpErrorCode != NULL) {
		*ftpErrorCode = _ftpErrorCode;
	}
	if (winInetErrorCode != NULL) {
		*winInetErrorCode = GetLastError();
	}
	if (winInetErrorText != NULL) {
		winInetErrorText = NULL;
	}
	return 0;
}


static int validateDirectories( wchar_t *remoteAddr ) {
	int returnValue = 0;
	wchar_t remoteDir[FTP_MAX_REMOTE_ADDR + 1];
	WIN32_FIND_DATAW findFileData;

	int remoteAddrLen = wcslen(remoteAddr);

	for (int i = 1; i < remoteAddrLen; i++) {
		if ( (remoteAddr[i] == '\\' || remoteAddr[i] == '/') && (remoteAddr[i-1] != '\\' && remoteAddr[i-1] != '/') ) {
			wcsncpy(remoteDir, remoteAddr, i);
			remoteDir[i] = '\x0';

			HINTERNET hFtpSession = InternetConnectW(_hInternet, _server, 
				INTERNET_DEFAULT_FTP_PORT, _user, _password, INTERNET_SERVICE_FTP, INTERNET_FLAG_PASSIVE, 0);
			if (hFtpSession) {
				bool status=true;
				if (FtpFindFirstFileW(hFtpSession, remoteDir, &findFileData, 0, NULL) == NULL) { // The directory wasn't found...
					//MessageBoxW( NULL, remoteDir, L"REMOTE DIR BEFORE CREATING!", MB_OK );
					status = FtpCreateDirectoryW(hFtpSession, remoteDir);
				}
				InternetCloseHandle(hFtpSession);
				if (!status) {
					returnValue = -1;
					break;
				}
			}
			else {
				returnValue = -1;
				break;
			}
		}
	}

	if( returnValue == 0 ) {
		dstDirIsValidated = true;
	}
	return returnValue;
}

static bool findCharsInString(wchar_t* str, wchar_t *chars)
{
	size_t strLen = wcslen(str);
	size_t charsLen = wcslen(chars);
	for (unsigned int s = 0; s < strLen; s++) {
		for (unsigned int c = 0; c < charsLen; c++) {
			if (str[s] == chars[c]) {
				return true;
			}
		}
	}
	return false;
}
