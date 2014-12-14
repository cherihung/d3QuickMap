#read in your csv
data <- read.csv("sourcedata_unemrate_counties.csv")
#subset the read-in csv data into a new variable/dataframe by selecting columsn
#this example selects the third and fifth column. use View(newdata) to see it.
newdata <- data[c(3,5)]
summary(newdata)

#test out by plotting a simple linear.
with(newdata, plot(sfips ~ unemployrate))
title(main="mychart")

# now to plot the regression 
attach(newdata)
lm.out = lm(sfips ~ unemployrate)
summary(lm.out)

#plot and give it a title
plot(sfips ~ unemployrate, main="My chart")
#draw the regression line in red
abline(lm.out, col="red")