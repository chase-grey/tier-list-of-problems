ZZPITCHEXPORT ; Export ZQN pitches as JSON for tier-list-of-problems app
 ; Usage: epc tool --env 527 ZZPITCHEXPORT^ZZPITCHEXPORT id1,id2,id3,...
 ; Output: JSON array written to stdout, redirect to a file as needed.
 n ids,i,zid,first
 s ids=$zcmdline,first=1
 w "["
 f i=1:1:$l(ids,",") d
 . s zid=$$trimSp($p(ids,",",i))
 . q:zid=""
 . q:'$$zisR("ZQN",zid)
 . i 'first w ","
 . s first=0
 . w !
 . d pitchJSON(zid)
 w !,"]",!
 q

pitchJSON(zid) ; Write one pitch object to stdout
 n title,note,f
 s title=$$geti("ZQN",zid,13,1,99999)
 i title="" s title=$$znam("ZQN",zid)
 s note=$$readNote(zid)
 d parseNote(note,.f)
 w "{"
 w $$jStr("id",zid),","
 w $$jStr("title",title),","
 w $$jBool("continuation",$g(f("continuation")))
 w ","
 w """details"":{"
 w $$jStr("problem",$g(f("problem"))),","
 w $$jStr("ideaForSolution",$g(f("idea"))),","
 w $$jStr("characteristics",$g(f("chars"))),","
 w $$jStr("whyNow",$g(f("why"))),","
 w $$jStr("smartToolsFit",$g(f("buckets"))),","
 w $$jStr("success",$g(f("success"))),","
 w $$jStr("maintenance",$g(f("maint"))),","
 w $$jBool("internCandidate",$g(f("intern")))
 w "}}"
 q

readNote(zid) ; Read ZQN item 200 (HTML note) as plain text with $c(10) line breaks
 ; KEY FIX: each subscript is joined with $c(10) so paragraph breaks are preserved.
 ; Previously subscripts were concatenated with no separator, losing all line breaks.
 n i,n,line,result
 s result="",n=+$$zgetnp("ZQN",zid,200,0,99999)
 f i=1:1:n d
 . s line=$$stripHTML($$zgetnp("ZQN",zid,200,i,99999))
 . i result'="" s result=result_$c(10)
 . s result=result_line
 q result

parseNote(note,.f) ; Parse template sections into f() array
 ; Uses partial header text so minor template wording changes don't break parsing.
 n pProb,pBkt,pIdea,pChar,pWhy,pSucc,pMaint,pIntern,pCont
 s pProb  ="Problem - framed as a user story"
 s pBkt   ="How does this fit into our roadmap"
 s pIdea  ="Idea for a solution"
 s pChar  ="Characteristics of a good solution"
 s pWhy   ="Why is this worth solving"
 s pSucc  ="How will we measure success"
 s pMaint ="anticipated maintenance and testing"
 s pIntern="good candidate for an intern"
 s pCont  ="continuation of an existing project"
 s f("problem") =$$getSection(note,pProb,pBkt)
 s f("buckets") =$$getPicklist(note,pBkt,pIdea)
 s f("idea")    =$$getSection(note,pIdea,pChar)
 s f("chars")   =$$getSection(note,pChar,pWhy)
 s f("why")     =$$getSection(note,pWhy,pSucc)
 s f("success") =$$getSection(note,pSucc,pMaint)
 s f("maint")   =$$getSection(note,pMaint,pIntern)
 s f("intern")  =$$getPicklist(note,pIntern,pCont)
 s f("continuation")=$$getPicklist(note,pCont,"")
 q

getSection(note,startHdr,nextHdr) ; Extract free-text content after startHdr's ***
 ; Returns content trimmed of leading/trailing whitespace, with $c(10) for newlines.
 n pos,starPos,nlPos,endPos,tmp,content
 s pos=$find(note,startHdr)
 q:pos=0 ""
 ; *** appears on the line immediately after the header
 s starPos=$find(note,"***",pos)
 q:starPos=0 ""
 ; Content starts at the line after ***
 s nlPos=$find(note,$c(10),starPos)
 q:nlPos=0 ""
 ; End just before nextHdr (or end of string)
 s endPos=$l(note)+1
 i nextHdr'="" d
 . s tmp=$find(note,nextHdr,nlPos)
 . i tmp>0 s endPos=tmp-$l(nextHdr)-1
 s content=$e(note,nlPos,endPos)
 q $$trimNL(content)

getPicklist(note,startHdr,nextHdr) ; Get first non-blank, non-*** line after startHdr
 ; Used for picklist fields (roadmap bucket, YES/NO) that have no *** separator.
 n pos,lStart,lEnd,endPos,tmp,line,result
 s result=""
 s pos=$find(note,startHdr)
 q:pos=0 ""
 s lStart=$find(note,$c(10),pos)
 q:lStart=0 ""
 s endPos=$l(note)+1
 i nextHdr'="" d
 . s tmp=$find(note,nextHdr,lStart)
 . i tmp>0 s endPos=tmp-$l(nextHdr)-1
 f  q:(lStart=0)!(lStart>endPos)!(result'="")  d
 . s lEnd=$find(note,$c(10),lStart)
 . i lEnd=0 s lEnd=$l(note)+1
 . s line=$$trimSp($e(note,lStart,lEnd-1))
 . i (line'="")&(line'="***") s result=line
 . s lStart=lEnd+1
 q result

stripHTML(html) ; Convert HTML to plain text, preserving <br> variants as $c(10)
 ; Handles <BR>, <br>, <br/>, <BR/>, <br />, <BR /> → $c(10)
 ; Strips all other HTML tags; decodes common entities.
 n r,s,inTag,i,c
 ; Replace <br> variants with newline placeholder before stripping tags
 s r=$$strRep(html,"<BR>",$c(10))
 s r=$$strRep(r,"<br>",$c(10))
 s r=$$strRep(r,"<BR/>",$c(10))
 s r=$$strRep(r,"<br/>",$c(10))
 s r=$$strRep(r,"<BR />",$c(10))
 s r=$$strRep(r,"<br />",$c(10))
 ; Strip remaining tags character by character
 s s="",inTag=0
 f i=1:1:$l(r) d
 . s c=$e(r,i)
 . i c="<" s inTag=1 q
 . i c=">" s inTag=0 q
 . i 'inTag s s=s_c
 ; Decode HTML entities
 s s=$$strRep(s,"&nbsp;"," ")
 s s=$$strRep(s,"&amp;","&")
 s s=$$strRep(s,"&lt;","<")
 s s=$$strRep(s,"&gt;",">")
 s s=$$strRep(s,"&quot;","""")
 s s=$$strRep(s,"&#39;","'")
 q s

 ; ── JSON helpers ─────────────────────────────────────────────────────────────

jStr(key,val) ; "key":"escaped-value"
 q """"_key_""":"""_$$jEsc(val)_""""

jBool(key,val) ; "key":true|false  (val is "Yes"/"No"/empty string)
 n bool
 s bool=($zcvt($e($$trimSp(val),1,3),"U")="YES")
 q """"_key_""":"_$s(bool:"true",1:"false")

jEsc(s) ; Escape a string for use inside a JSON double-quoted value
 n r
 s r=$$strRep(s,"\","\\")          ; backslash must be first
 s r=$$strRep(r,"""",$c(92)_"""")  ; double-quote  → \"
 s r=$$strRep(r,$c(10),"\n")       ; LF            → \n  (two chars: \ n)
 s r=$$strRep(r,$c(13),"")         ; CR            → strip
 s r=$$strRep(r,$c(9),"\t")        ; tab           → \t
 q r

 ; ── String utilities ─────────────────────────────────────────────────────────

strRep(s,find,rep) ; Replace all occurrences of find in s with rep
 n r,fl,pos
 s r="",fl=$l(find)
 q:fl=0 s
 f  q:s=""  d
 . s pos=$find(s,find)
 . i pos=0 s r=r_s,s="" q
 . s r=r_$e(s,1,pos-fl-1)_rep
 . s s=$e(s,pos,$l(s))
 q r

trimNL(s) ; Trim leading/trailing newlines, CRs, and spaces
 n r
 s r=s
 f  q:(r="")!(($e(r,1)'=$c(10))&($e(r,1)'=$c(13))&($e(r,1)'=" "))  s r=$e(r,2,$l(r))
 f  q:(r="")!(($e(r,$l(r))'=$c(10))&($e(r,$l(r))'=$c(13))&($e(r,$l(r))'=" "))  s r=$e(r,1,$l(r)-1)
 q r

trimSp(s) ; Trim leading/trailing spaces only
 n r
 s r=s
 f  q:(r="")!($e(r,1)'=" ")  s r=$e(r,2,$l(r))
 f  q:(r="")!($e(r,$l(r))'=" ")  s r=$e(r,1,$l(r)-1)
 q r
