set launchAgentPath to "/Users/ji-ho/Library/LaunchAgents/com.jiho.archive-capture-receiver.plist"
set serviceLabel to "com.jiho.archive-capture-receiver"
set launchDomain to "gui/501"
set serviceTarget to launchDomain & "/" & serviceLabel

set picked to choose from list {"Start receiver", "Stop receiver", "Check status"}

if picked is false then return

set selectedAction to item 1 of picked

if selectedAction is "Start receiver" then
	try
		do shell script ("/bin/launchctl bootstrap " & quoted form of launchDomain & " " & quoted form of launchAgentPath)
		display dialog "The capture receiver is running."
	on error errText
		display dialog errText
	end try
else if selectedAction is "Stop receiver" then
	try
		do shell script ("/bin/launchctl bootout " & quoted form of serviceTarget)
		display dialog "The capture receiver has stopped."
	on error errText
		display dialog errText
	end try
else
	try
		do shell script ("/bin/launchctl print " & quoted form of serviceTarget)
		display dialog "Receiver is running."
	on error
		display dialog "Receiver is stopped."
	end try
end if
