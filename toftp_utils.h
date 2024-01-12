#ifndef __TOFTP_H
#define __TOFTP_H

	void deleteSpacesFromString(wchar_t* str);
	void toLower( wchar_t *s );
	bool isEmptyString(wchar_t* str, bool comma_is_empty_char=false);
	void deleteCharFromString(wchar_t* str, int pos);
	void substituteCharInString(wchar_t*str, wchar_t charToFind, wchar_t charToReplaceWith);
	wchar_t *getPtrToFileName(wchar_t* path);
	void appendDirectoryNameWithEndingSlash(wchar_t *dirName, wchar_t slash);
	int decrypt(char *src, wchar_t *dst);

#endif