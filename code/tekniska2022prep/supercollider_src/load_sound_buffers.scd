{ var sounds_path = "./sounds/".resolveRelative;
	~bufs = Environment.new(know: true);
	~bufs.camera_beep = Buffer.readChannel(s, sounds_path ++ "camera_beep.wav", 0, -1, [0]);
	~bufs.camera_shutter = Buffer.readChannel(s, sounds_path ++ "camera_shutter.wav", 0, -1, [0]);
}.();
