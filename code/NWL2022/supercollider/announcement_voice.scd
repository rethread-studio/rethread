(
~fft_buf = Buffer.alloc(s,2048,1);
Ndef(\grain_voice_mvt,
	{var sig, pan = 0, pos, cutfreq = [350, 1000, 100], fft, freq, hasFreq;
		sig = SoundIn.ar(0);
		# freq, hasFreq = Tartini.kr(sig);
		SendReply.kr(Impulse.kr(30), '/amp', Amplitude.kr(sig), freq*hasFreq);
		fft = FFT(~fft_buf, sig);
		// IFFT(~fft_buf);
		sig = PitchShift.ar(sig, 0.2, [1.0, 0.875, 0.75], 0.01, 0.01);
		sig = Mix(sig * [1.0, 0.5, 0.15]);
		//sig = PlayBuf.ar(1, bufnum, BufRateScale.ir(bufnum));
		sig = LPF.ar(sig, 4000);
		sig = HPF.ar(sig, 100);
		sig = BPeakEQ.ar(sig, 1500, 0.2, 10);
		cutfreq.do{|cut|
			sig = BPeakEQ.ar(sig, cut, 0.8, -10);
		};
		sig = (sig * 0.5) + (FreeVerb.ar(sig, 0.2) * 0.5);
		// sig = (sig*0.5) + (sig * (Demand.kr(Dust.kr(LFNoise1.kr(1/2).range(5, 20)) + Impulse.kr(0), 0, Dseq([1, 0], inf))) * 0.5);
		// sig = sig * LFNoise2.kr(1).range(0.1, 1.0);
		sig = Pan2.ar(sig * 1);
		sig = (sig!2).flatten;
		Out.ar(0, sig);
}).play;

OSCdef(\amp, {
	arg msg;
	msg.postln;
}, '/amp');

~magnitudes = [];
Routine({
    loop{
        ~fft_buf.getToFloatArray(action: { arg array;
            var z, x;
            z = array.clump(2).flop;
            // Initially data is in complex form
            z = [Signal.newFrom(z[0]), Signal.newFrom(z[1])];
            x = Complex(z[0], z[1]);
			~magnitudes = x.magnitude;
			// x.magnitude.postln;

        });
        0.01.wait;
}}).play
)

(
var w, much = 0.02, string, synth;

w = Window.new("gui", Rect(100, 100, 300, 500)).front;
w.view.background_(Color.new255(0).vary);

w.drawFunc = Routine {
	loop {
		var width = w.bounds.width, height = w.bounds.height;
		var num_bins, x_pos = 0;
		/*Pen.fillColor = Color.black;
		Pen.fillRect(w.bounds);*/
		num_bins = ~magnitudes.size;
		~magnitudes.do {| mag, i | var y_pos;
			Pen.strokeColor = Color.new255(255, 0, 0);
			y_pos = ((1.0-mag.pow(1))*1)*height;
			Pen.lineTo(Point(x_pos, y_pos));

			x_pos = x_pos + (width/num_bins);
		};
		Pen.perform(\stroke);
		// { x.magnitude.plot('Initial', Rect(200, 600-(200*i), 700, 200)) }.defer
		0.yield
	}
};

{ while { w.isClosed.not } { w.refresh; 0.016.wait; } }.fork(AppClock);

w.front;

)
{ ~magnitudes.plot('Initial', Rect(200, 0, 700, 200)) }.defer
~magnitudes.size