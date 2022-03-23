~presets = [
	{
		~transitionSlowdown.(8, 3, rrand(0.1, 0.5), [0.5, 0.25, 1.0].choose);
		~enable_ftrace = true;
		~enable_user = true;
		~enable_server = true;
	},
	{
		~transitionSlowdown.(8, 3, rrand(0.1, 0.5), [0.5, 0.25, 1.0].choose);
		~enable_ftrace = true;
		~enable_user = true;
		~enable_server = false;
	},
	{
		~transitionSlowdown.(8, 3, rrand(0.1, 0.5), [0.5, 0.25, 1.0].choose);
		~start_beep_process.();
		~start_tick_process.();
		~enable_ftrace = true;
		~enable_user = false;
		~enable_server = false;
	},
	{
		~transitionSlowdown.(8, 3, rrand(0.1, 0.5), [0.5, 0.25, 1.0].choose);
		~stop_beep_process.();
		~stop_tick_process.();
		~enable_ftrace = false;
		~enable_user = true;
		~enable_server = true;
	},
	{
		~stop_beep_process.();
		~stop_tick_process.();
		~enable_ftrace = true;
		~enable_user = false;
		~enable_server = true;
		~ftrace_noise_freq_ratio = rrand(0.1, 1.0);
	},
	{
		~stop_beep_process.();
		~stop_tick_process.();
		~enable_ftrace = false;
		~enable_user = true;
		~enable_server = false;
		~freq_ratio = [0.5, 1.0].choose;
	},
];
~autoChangePreset = {
	{
		loop {
			~presets.choose.();
			rrand(20, 40).wait;
		}
	}.fork;
};
