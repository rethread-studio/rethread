import json
  
# Opening JSON file
f = open('./questions.json',)
 
  
types={'conrad' : 0, 'curie' : 0, 'dylan' : 0, 'dalai_lama' : 0, 'morrison' : 0, 'lagerlof' : 0, 'fleming' : 0, 'king' : 0, 'arnold' : 0, 'ostrom' : 0, 'einstein' : 0, 'yousafzai' : 0, 'montalcini' : 0, 'sachs' : 0, 'teresa' : 0, 'CS' : 0 , 'nobel' : 0}
  
# returns JSON object as a dictionary
questions = json.load(f)
for i in questions:
	if 'type' in i:
		types[i['type']]= types[i['type']]+1
	else:
		print('no type')

print('We miss a few questions for: ')
for t in types:
	if types[t] < 3:
		print(t)

print('Status of the questions')
for t in types:
	print(t,' : ',types[t])

f.close()
