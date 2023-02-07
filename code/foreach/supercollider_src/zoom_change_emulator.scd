// zoom level to pitch shift emulator


(
~main_glitch.set(\lag_time, 0.1);
~zoom_last = 1.0;
~zoom_change = 0.0;
w = Window.new.front;
c = NumberBox(w, Rect(20, 20, 150, 20));
a = Slider(w, Rect(20, 60, 150, 20))
    .action_({
	var change = a.value - ~zoom_last;
	~zoom_change = ~zoom_change + change.abs();
	c.value_(a.value);
	~main_glitch.set(\pitch_shift_ratio, (a.value * 0.85) + 0.15);

        });
a.value = ~zoom_last;
a.action.value;
{
	loop {
		~zoom_change = ~zoom_change * 0.8;
		~zoom_change.postln;
		~main_glitch.set(\pitch_dispersion, (~zoom_change*0.01).pow(4.0));
		~main_glitch.set(\time_dispersion, (~zoom_change*0.01).pow(3.0));
		0.05.wait;
	};
}.fork;
)