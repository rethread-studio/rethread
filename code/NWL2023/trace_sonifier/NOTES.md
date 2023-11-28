
# Instruction types

Sine waves triggered when an instruction pops up in the trace. 
- Works will with one or two instructions with short sines for a little bit of texture on the note
- With many different instructions, longer sines and a slower tempo is better. Also, harmonic changes help.
- Reverb!




# Utveckling av short_sines:

- Hitta de mest intressanta instruktionerna i varje spår. De får inte triggas för ofta. Olika spår kan ha olika hastighet.
- Spela upp dem med neodljudsyntesen.
- Lägg till ornamentik som förslag.


"jmp"
movdqu
jz

# Time and time signatures

The overall form of the piece is a 2 + 1 (60s movement +  30s "break") form, which mirrors the most common form in the software. Some operations are further subdivided in three and some in 4 with a recurring 1+2+1 pattern. The music reflects this by the amplitude of pulses and how often chords are changed.

Each block of activity in the software execusion generally contains 32 "beats", or iterations, coinciding with the dimensionality of the matrix. Similarly, every movement in the music has 32 pulses.

A very common feature in the software execution is an accellerando, as iterations work on smaller and smaller subsections of the matrix. The music reflects this through the modulation of sine waves in the "break" part.


## Multiply

Storform approx 2+1
First part has a repeating pattern in 4/4 1+2+1 with accelerando to the second part.
Second part has no such clear structure, but it is steadily doing a ritardando.

## SVD

Same pattern as Multiply


## Normalize

Very short, just init burst and then a slightly longer burst of noise.

## Inverse

Init burst
3 longer sections, the first slightly shorter.

## Hesseberg

Varies based on the source matrix.

### Diagonal 3
Instead of an accelerando, a ritardando over the entire trace. 1 long section only, apart from the init burst.

### Random 3
4+4+7

# Harmony

Like the 32 rows and columns of the matrices we have been experimenting on, the harmony of the piece consists of 32 chords. The tuning system used is 53-EDO and the chords, in ups and downs notation, are Cv7, C^m7, CvM9 and Csus24, transposed a fifth up eight times. To determine the next chord, a matrix in the current operation is used as an adjacency matrix, interpreted as the probability of moving to any of the other chords from the current chord. To illustrate passing from source matrix to the result of the operation performed, the source matrix is used as the adjacency matrix in the first two thirds of a movement and the resulting matrix in the last third.

# Melody

Some of the least used machine instructions in the trace are turned into a melody. Depending on its rarity, the instructions is assigned a pitch and, working our way through a small portion of the trace, we allow each instruction to take some times, whether it is played or not. The machine instructions are treated as a score, of which we play only one part out of many. As any human interpreter, our machine musician freely adds its own inflection and ornamentation to ameliorate the music.

# Audification

Anything that is data can be turned into sound by simply reinterpreting the numbers as digital audio; a process called audification. The audification of the actual traces machine code instructions can be heard as the wave like spacey chords in the background and the high noisy flute like drone in the break section.